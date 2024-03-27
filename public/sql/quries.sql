CREATE TABLE Auctions1 (auctionId BIGSERIAL PRIMARY KEY,sellerId integer ,prodName text,
prodImg bytea,
description text,
category text,
startTime TIMESTAMP,
endTime TIMESTAMP,
duration INTERVAL,
basePrice integer,
highesBid integer,
prodStatus text,
auctionStatus text );





CREATE TABLE Bids (bidId BIGSERIAL PRIMARY KEY,auctionId FOREIGN KEY references Auctions(auctionId),userId integer ,amount integer );




feature items based on  time remaining


CREATE OR REPLACE FUNCTION get_sorted_rows()
RETURNS TABLE(
    auctionId integer,sellerId integer ,prodName text,
    prodImg bytea,
    description text,
    category text,
    startTime TIMESTAMP,
    endTime TIMESTAMP,
    duration INTERVAL,
    basePrice integer,
    highesBid integer,
    prodStatus text,
    auctionStatus text
     )
 AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM Auctions
    ORDER BY endTime;
END;
$$ LANGUAGE plpgsql;