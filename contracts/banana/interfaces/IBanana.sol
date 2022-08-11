// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import "../../interfaces/IERC20.sol";

interface IBanana is IERC20 {
    event RedeemTimeChanged(uint256 oldRedeemTime, uint256 newRedeemTime);
    event Mint(address indexed to, uint256 apeXAmount, uint256 mintAmount);
    event Burn(address indexed from, uint256 amount);
    event Redeem(address indexed user, uint256 burntAmount, uint256 apeXAmount);

    function apeXToken() external view returns (address);
    function redeemTime() external view returns (uint256);

    function mint(address to, uint256 apeXAmount) external returns (uint256);
    function burn(address from, uint256 value) external returns (bool);
    function redeem(uint256 amount) external returns (uint256);
}