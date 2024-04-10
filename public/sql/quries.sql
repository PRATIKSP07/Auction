CREATE TABLE Auctions (auctionId BIGSERIAL PRIMARY KEY,sellerId integer ,prodName text,
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




CREATE  OR REPLACE FUNCTION userBids(integer user_id)
RETURNS TABLE(
    bidId integer,
    auctionId integer,
    userId integer,
    amount integer 
)
AS $$
BEGIN
  RETURN QUERY 
    SELECT auctionId, userId, MAX(amount) AS highestBid
    FROM Bids
    WHERE userId = user_id
    GROUP BY auctionId, userId;
END;
$$
LANGUAGE PLPGSQL;

CREATE OR REPLACE FUNCTION searchAuctions( category_flag boolean,q_text text)
RETURNS TABLE (auctionId BIGINT,sellerId integer ,prodName text,
prodImg bytea,
description text,
category text,
startTime TIMESTAMP,
endTime TIMESTAMP,
duration INTERVAL,
basePrice integer,
highesBid integer,
prodStatus text,
auctionStatus text )
AS $$
BEGIN
        IF category_flag THEN
            RETURN QUERY SELECT 
                auctions.auctionId,
                auctions.sellerId,
                auctions.prodName,
                auctions.prodImg,
                auctions.description,
                auctions.category,
                auctions.startTime,
                auctions.endTime,
                auctions.duration,
                auctions.basePrice,
                auctions.highestBid,
                auctions.prodStatus,
                auctions.auctionStatus
                FROM Auctions WHERE LOWER(auctions.category) LIKE LOWER('%'||q_text||'%');
        ELSE
            RETURN QUERY SELECT 
                auctions.auctionId,
                auctions.sellerId,
                auctions.prodName,
                auctions.prodImg,
                auctions.description,
                auctions.category,
                auctions.startTime,
                auctions.endTime,
                auctions.duration,
                auctions.basePrice,
                auctions.highestBid,
                auctions.prodStatus,
                auctions.auctionStatus
                FROM Auctions WHERE LOWER(auctions.prodName) LIKE LOWER('%'||q_text||'%') OR LOWER(auctions.description) LIKE LOWER('%'||q_text||'%') ;
        END IF;
END;
$$
LANGUAGE PLPGSQL;
