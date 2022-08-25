// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.15;

import "hardhat/console.sol";

contract Auction {
    address public owner;
    uint constant DURATION_DEFAULT = 2 days;
    uint constant FEE = 5;

    struct AuctionI {
        address payable seller;
        uint startingPrice;
        uint finalPrice;
        uint startAt;
        uint endsAt;
        uint discountRate; // на сколько цена будет падать
        string item;
        bool stopped;
    }

    AuctionI[] public auctions;

    event newAuctionEvent(uint id,string item,uint startPrice, uint duration);
    event AuctionEnded(uint id,uint price, address winner);
    event AuctionStopped(uint id);

    constructor() {
        owner = msg.sender;
    }

    function createAuction(
        uint _startPrice,
        uint _discount,
        string calldata _item,
        uint _duration
    ) external {
        uint duration = _duration == 0 ? DURATION_DEFAULT : _duration;

        require(_startPrice >= _discount * duration, "the initial price is too low compared to the time");
        AuctionI memory newAuction = AuctionI({
        seller:payable(msg.sender),
        startingPrice:_startPrice,
        finalPrice:_startPrice,
        startAt:block.timestamp,
        endsAt:block.timestamp + duration,
        discountRate: _discount,
        item:_item,
        stopped:false
        });

        auctions.push(newAuction);
        emit newAuctionEvent(auctions.length - 1, _item, _startPrice, duration);
    }

    function getPriceFor(uint index) public view returns(uint) {
        AuctionI memory mAuction = auctions[index];
        require(!mAuction.stopped, "stopped");
        uint elapsed = block.timestamp - mAuction.startAt;
        uint discount = mAuction.discountRate * elapsed;

        return mAuction.startingPrice - discount;
    }

    function stop(uint index) external {
        AuctionI storage mAuction = auctions[index];
        require(mAuction.seller != msg.sender, 'not a owner');
        mAuction.stopped = true;
        emit AuctionStopped(index);
    }

    function buyItem(uint index) external payable {
        AuctionI storage mAuction = auctions[index];
        require(!mAuction.stopped, "stopped");
        require(mAuction.endsAt > block.timestamp, "time is over");

        uint cPrice = getPriceFor(index);
        require(msg.value >= cPrice, 'not enough funds');

        mAuction.stopped = true;
        mAuction.finalPrice = cPrice;

        mAuction.seller.transfer(
            cPrice - ((cPrice * FEE) / 100)
        );

        uint refund = msg.value - cPrice;
        if(refund > 0) {
            payable(msg.sender).transfer(refund);
        }

        emit AuctionEnded(index, cPrice, msg.sender);
    }
}
