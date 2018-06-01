create table "user" (
  id int not null primary key, --convert to base36 when sent to client
  ts int default (strftime('%s','now')), -- created date, timestamp in epoch
  "name" text check(trim(name) <> ''),
  email text not null unique check(trim(email) <> ''), -- all lovercase
  pt int default 3, -- point, each time the user request a book, pt--, but when the user give a book, pt++, cannot request a book when pt is < 1
  pw blob not null, -- password
  token blob unique, -- hashed token for user authentication, very likely unique
  token_ts int, -- ts when token is created
  token_ts_exp int -- ts when token SHOULD be expired
);


/* book
  1) when a user create a book, populate id, bid, uid, ts
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

create table book (
  id int not null primary key,
  bid int not null, -- book id, from google book API, this is text
  uid int not null references "user"(id), -- user who own this book
  ts int default (strftime('%s','now')),
  req json, -- request for this book [{ uid, ts }]
  nid int references book(id),
  status int, -- 1: success transferred to a new ower, 0: declined
  del int, -- ts when deleted
  iid int not null references(id) -- the initial id
);
