create table "user" (
  id int not null primary key, --convert to base36 when sent to client
  ts int not null default (strftime('%s','now')), -- created date, timestamp in epoch
  "name" text check(trim(name) <> ''),
  email text not null unique check(trim(email) <> ''), -- all lovercase
  pw blob not null, -- password
  token blob unique, -- hashed token for user authentication, very likely unique
  token_ts int, -- ts when token is created
  token_ts_exp int -- ts when token SHOULD be expired
);


/* book
  1) when a user create a book
    - in book: populate id, ts and gid
    - in user_book: popluate bid, which reference book(id), uid, ts
  2) when a request is made against a book
    - in book_user: insert a new row with the old bid, uid, then rid, ts
  3) the owner then decide, in book_user
    - if grant, update the row in 2) with status: 1 success, then insert a new row with new ts, same bid, uid is now = rid
    - if declined, update the row in 2) with status: 0 declined
  3) when owner delete the book, in book_user, insert a new row with bid, ts, but no uid

  ### Query ###

  -- show all current books
  select * from book_user where uid is not null group by bid

  -- show 

  
*/

create table book (
  id int not null primary key,
  ts int not null default (strftime('%s','now')),
  gid text not null -- book id, from google book API, this is text
);

/* book
  1) when a user create a book, populate id, uid, ts
  2) when this book is requested, populate req
  3) owner make a decision
    a) accept: insert a new row with new id, bid = previous bid, uid = new user id, new ts, status = 1
       then in the old row, populate nid = new id
    b) decline: insert a new row with new id, bid = previous bid uid = old uid, new ts, status = 0
       then in the old row, populate id = new id

  list all current books 
    select * where nid is null and del it not null

  list all books owned by a user currently
    select * where nid is null and del it not null and uid == UID group by iid

  list all books owned by a user at all time
    select * where uid == UID group by iid

  list all current pending transctions
    select * where nid is null and del is not null and req is not null

  list all transactions requested by user
    select * where json_tree something uid

  list transction history of a particular book
    select * where iid == id

  upside:
    can follow the history of a book transactions
    multiple users can request the same book

  downside:
    bid is repeated many times
*/

create table book_user (
  ts int not null default (strftime('%s','now')),
  bid int not null references book(id),
  uid int references "user"(id), -- owner, when null, this book has been deleted
  rid int references "user"(id), -- the user who requests this book,
  status int, -- null: pending; 1: success, the book will be transferred into owner rid; 0: declined, the book will remain with owner uid
  check (uid != rid)
);
-- create trigger book_user_status
--   after update of status on book_user
--   begin
--     update book_user
--   end;