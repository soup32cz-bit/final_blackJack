// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract ItemWeapon {
    string public name = "ItemWeapon";
    string public symbol = "IWP";
    address public owner;
    uint256 public nextTokenId;

    struct Weapon {
        string itemName;
        string description;
        string image; // IPFS URL
        bool isUsed;
        address owner;
    }

    mapping(uint256 => Weapon) public weapons;
    mapping(address => uint256[]) public ownerWeapons;
    // เพิ่ม mapping เพื่อตรวจสอบว่ารูปภาพนี้ถูก mint ไปแล้วหรือยัง
    mapping(string => bool) public imageMinted;
    constructor() {
        owner = msg.sender;
    }
    //Weapon
    // เอา `onlyOwner` ออก และเพิ่มเงื่อนไขการตรวจสอบ
    function mintWeapon(
        address to,
        string memory itemName,
        string memory description,
        string memory image
    ) public {
        // ตรวจสอบว่าอาวุธ (จาก URL รูปภาพ) ชิ้นนี้ยังไม่เคยถูก mint มาก่อน
        require(!imageMinted[image], "This weapon has already been minted.");
        weapons[nextTokenId] = Weapon(itemName, description, image, false, to);
        ownerWeapons[to].push(nextTokenId);
        // บันทึกว่ารูปภาพนี้ถูก mint ไปแล้ว
        imageMinted[image] = true;
        nextTokenId++;
    }

    function getMyWeapons() public view returns (Weapon[] memory) {
        uint256[] memory myIds = ownerWeapons[msg.sender];
        Weapon[] memory myWeapons = new Weapon[](myIds.length);
        for (uint i = 0; i < myIds.length; i++) {
            myWeapons[i] = weapons[myIds[i]];
        }
        return myWeapons;
    }

    function markAsUsed(uint256 tokenId) public {
        require(weapons[tokenId].owner == msg.sender, "Not your weapon");
        weapons[tokenId].isUsed = true;
    }

    function useWeapon(uint256 tokenId) public {
        require(weapons[tokenId].owner == msg.sender, "Not the owner");
        require(!weapons[tokenId].isUsed, "Weapon already used");
        weapons[tokenId].isUsed = true;
    }

    function getWeapon(uint256 tokenId) public view returns (Weapon memory) {
        return weapons[tokenId];
    }
}