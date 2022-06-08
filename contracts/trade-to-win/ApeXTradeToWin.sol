// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract ApeXTradeToWin is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public counter;
    address public APEX;

    mapping(address => bool) public joined;
    mapping(address => bool) public eligibleWithdrawal;

    event LogStake(address indexed user);
    event LogUnstake(address indexed user);
    event LogTokenTransferred(IERC20 indexed token, address indexed recipient, uint256 amount);
    event LogNativeTransferred(address indexed recipient, uint256 amount);

    constructor(address _APEXAddr) {
        APEX = _APEXAddr;
    }

    /// @notice Users need approve this smart contract at least 800 APEX before calling
    function stake() external nonReentrant {
        require(counter < 100, "stake: sorry, already full");
        require(!joined[msg.sender], "stake: already joined");

        IERC20(APEX).safeTransferFrom(msg.sender, address(this), 800 ether);

        joined[msg.sender] = true;

        counter += 1;

        (bool success, ) = msg.sender.call{value: 5e16}(new bytes(0));
        require(success, "stake: failed to send ETH");

        emit LogStake(msg.sender);
    }

    /// @notice Careful with gas cost by loop!! 
    function allowWithdrawal(address[] calldata _users) external onlyOwner {
        for (uint8 i; i < _users.length; i++) {
            eligibleWithdrawal[_users[i]] = true;
        }
    }

    function unstake() external {
        require(joined[msg.sender], "unstake: did not join");
        require(eligibleWithdrawal[msg.sender], "unstake: ineligible to withdraw");

        joined[msg.sender] = false;
        eligibleWithdrawal[msg.sender] = false;

        IERC20(APEX).safeTransfer(msg.sender, 800 ether);

        emit LogUnstake(msg.sender);
    }
    
    function transferToken(
        IERC20 _token, 
        address _recipient, 
        uint256 _amount
    ) external onlyOwner {
       require(_token.balanceOf(address(this)) >= _amount, "transferToken: insufficient token balance");
 
       _token.safeTransfer(_recipient, _amount);
 
       emit LogTokenTransferred(_token, _recipient, _amount);
    }

    function transferNative(address _recipient, uint256 _amount) external onlyOwner nonReentrant { 
       (bool success, ) = _recipient.call{value: _amount}(new bytes(0));
 
       require(success, "transferNative: failed to transfer native");
 
       emit LogNativeTransferred(_recipient, _amount);
    }
}