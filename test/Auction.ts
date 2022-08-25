import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Auction", function () {
  async function deployOneYearLockFixture() {
    const [owner, seller, buyer] = await ethers.getSigners();

    const Auction = await ethers.getContractFactory("Auction");
    const auct = await Auction.deploy();

    return { auct, owner, seller, buyer };
  }

  describe("createAuction", function () {
    it("creates auction correctly", async function () {
      const { auct, seller, } = await loadFixture(deployOneYearLockFixture);

      const createA = await auct.connect(seller).createAuction(
         ethers.utils.parseEther('1'),
         ethers.utils.parseEther('0.0001'),
         'nft',
         300,
      );

      const actionItem = await auct.auctions(0);

      expect(actionItem.item).to.eq('nft')
      expect(actionItem.seller).to.eq(seller.address)
    });

    function delay(ms:number) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    describe("buyItem", function () {
      it("check price", async function () {
        const { auct, seller, buyer} = await loadFixture(deployOneYearLockFixture);
        const priceItem = ethers.utils.parseEther('20');

        await auct.connect(seller).createAuction(
           priceItem,
           ethers.utils.parseEther('0.1'),
           'nft',
           100,
        );

        await time.increase(10)

        const actionItem = await auct.auctions(0);

        expect(+(await ethers.utils.formatEther(await auct.getPriceFor(0)))).to.eq(19)
      })

      it("buy item", async function () {
        const { auct, seller, buyer} = await loadFixture(deployOneYearLockFixture);
        const priceItem = ethers.utils.parseEther('1');

        await auct.connect(seller).createAuction(
           priceItem,
           ethers.utils.parseEther('0.0001'),
           'nft',
           10,
        );

        const buy = await auct.connect(buyer).buyItem(0, {value: priceItem});

        const actionItem = await auct.auctions(0);

        await expect(buy)
           .to.emit(auct, 'AuctionEnded')
           .withArgs(0, actionItem.finalPrice, buyer.address)

        // second test of item creation & item purchase

        await auct.connect(seller).createAuction(
           ethers.utils.parseEther('20'),
           ethers.utils.parseEther('0.1'),
           'nft 2',
           100,
        );

        await time.increase(10)
        const actionItemTwo = await auct.auctions(1);

        const secondBuy = await auct.connect(buyer).buyItem(1, {value: priceItem});
      })

      it("error two buy item", async function () {
        const { auct, seller, buyer} = await loadFixture(deployOneYearLockFixture);
        const priceItem = ethers.utils.parseEther('1');

        await auct.connect(seller).createAuction(
           priceItem,
           ethers.utils.parseEther('0.0001'),
           'nft',
           10,
        );

        await auct.connect(buyer).buyItem(0, {value: priceItem});

        const actionItem = await auct.auctions(0);
        await expect(actionItem.stopped).to.eq(true);

        await expect(
           auct.connect(buyer).buyItem(0, {value: priceItem})
        )
           .to.be.revertedWith('stopped');
      })
    })
  })
})