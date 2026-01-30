// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SecuritizationIdentifier
 * @dev ERC721 identifier for a securitized loan. One token per securitization; tokenId = verificationTokenId.
 * Only the LoanSecuritization contract can mint.
 */
contract SecuritizationIdentifier is ERC721, Ownable {
    address public minter;

    constructor(address initialOwner) ERC721("Securitization Identifier", "SECID") Ownable(initialOwner) {}

    function setMinter(address _minter) external onlyOwner {
        minter = _minter;
    }

    function mint(address to, uint256 tokenId) external {
        require(msg.sender == minter, "Only minter");
        _safeMint(to, tokenId);
    }
}
