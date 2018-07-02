create table "user" (
  id int not null primary key, --convert to base36 when sent to client
  ts int not null default (strftime('%s','now')), -- created date, timestamp in epoch
  "name" text not null check(trim(name) <> ''),
  email text not null unique check(trim(email) <> ''), -- all lovercase
  city text,
  pw text not null, -- password
  token blob unique, -- hashed token for user authentication, very likely unique
  token_ts int, -- ts when token is created
  token_ts_exp int -- ts when token SHOULD be expired
);


/* book
  1) when a user create a book
    - in book: populate id, ts and gid
    - in user_book: populate bid, which reference book(id), uid, ts, rid = uid, status = 1
  2) when a request is made against a book
    - in book_user: insert a new row with the old bid, uid, then rid, ts, leave status as null
  3) the owner then decide, in book_user
    - if grant, update the row in 2) with status: 1 success, then insert a new row with new ts, same bid, uid is now = rid
    - if declined, update the row in 2) with status: 0 declined
  3) when owner delete the book, in book_user, insert a new row with bid, ts, but no uid

  ### Query ###

  -- show all current books
  select * from book_user group by bid

  
*/

create table book (
  id int not null primary key,
  ts int not null default (strftime('%s','now')),
  gid text not null -- book id, from google book API, this is text
);

create table book_user (
  ts int not null default (strftime('%s','now')),
  bid int not null references book(id),
  uid int references "user"(id), -- owner, when null, this book has been deleted
  rid int references "user"(id), -- the user who requests this book, initially this is the same as uid
  status int -- null: pending; 1: the book will be transferred into owner rid; 0: the book will remain with owner uid
);

create view active_book as
  select *, max(rowid) as rowid from book_user
    where status is 1
    and bid not in
      (select bid from book_user where uid is null)
    group by bid;


create trigger book_user_before_insert_new_request
  before insert on book_user
  when new.uid is not null
  begin  
    select case
      when exists (select 1 from book_user where bid == new.bid limit 1)
        and new.uid != (select rid from book_user where bid == new.bid and status == 1 order by rowid desc limit 1)
      then raise(abort, 'The book is not owned by the user') end;
    select case
      when new.uid == new.rid and new.status is not 1
      then raise(abort, 'Status has to be 1 when uid and rid are the same') end;
    select case
      when new.uid is not new.rid and new.status is not null
      then raise(abort, 'Status has to be null when uid and rid are different') end;
    select case
      when exists (select 1 from book_user where bid == new.bid and uid == new.uid and rid == new.rid and status is null limit 1)
      then raise(abort, 'This request is in queue') end;
    select case
      when new.uid is not null and new.rid is null
      then raise(abort, 'rid is required when uid is provided') end;
  end;
create trigger book_user_after_insert_delete
  after insert on book_user
  when new.uid is null
  begin
    select 1;
    update book_user set status = 0 where bid = new.bid and status is null; -- has to put uid is null, this will trigger the book_user_after_update_status
  end;
create trigger book_user_before_update
  before update on book_user
  begin
    -- select case
    --   when new.bid is not null or new.uid is not null or new.rid is not null
    --   then raise(abort, 'Cannot update bid, uid or rid') end;
    select case
      when new.status is null
      then raise(abort, 'Cannot set status to null') end;
    select case
      when old.status is not null and new.status is not old.status
      then raise(abort, 'Status cannot be changed') end;
  end;
create trigger book_user_after_update_status
  after update of status on book_user
  begin
    update book_user set status = 0 where bid = old.bid and status is null;
    insert into book_user (bid, uid, rid, status) select new.bid, new.rid, new.rid, 1 where new.status = 1;
  end;

