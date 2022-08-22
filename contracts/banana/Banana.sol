// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import "./interfaces/IBanana.sol";
import "../utils/Ownable.sol";
import "../libraries/TransferHelper.sol";

contract Banana is IBanana, Ownable {
    string public constant override name = "Banana";
    string public constant override symbol = "BANA";
    uint8 public constant override decimals = 18;
    
    address public override apeXToken;
    uint256 public override redeemTime;
    uint256 public override totalSupply;
    mapping(address => uint256) public override balanceOf;
    mapping(address => mapping(address => uint256)) public override allowance;

    mapping(address => bool) public minters;
    mapping(address => bool) public burners;

    constructor(address apeXToken_, uint256 redeemTime_) {
        owner = msg.sender;
        apeXToken = apeXToken_;
        redeemTime = redeemTime_;
    }

    function updateRedeemTime(uint256 redeemTime_) external onlyOwner {
        require(redeemTime_ > block.timestamp, "need over current time");
        emit RedeemTimeChanged(redeemTime, redeemTime_);
        redeemTime = redeemTime_;
    }

    function addMinter(address minter) external onlyOwner {
        minters[minter] = true;
    }

    function removeMinter(address minter) external onlyOwner {
        minters[minter] = false;
    }

    function addBurner(address burner) external onlyOwner {
        burners[burner] = true;
    }

    function removeBurner(address burner) external onlyOwner {
        burners[burner] = false;
    }

    function mint(address to, uint256 apeXAmount) external override returns (uint256) {
        require(minters[msg.sender], "forbidden");
        require(apeXAmount > 0, "zero amount");

        uint256 apeXBalance = IERC20(apeXToken).balanceOf(address(this));
        uint256 mintAmount;
        if (totalSupply == 0) {
            mintAmount = apeXAmount * 1000;
        } else {
            mintAmount = apeXAmount * 1000 * totalSupply / apeXBalance;
        }

        TransferHelper.safeTransferFrom(apeXToken, msg.sender, address(this), apeXAmount);
        _mint(to, mintAmount);
        emit Mint(to, apeXAmount, mintAmount);
        return mintAmount;
    }

    function burn(address from, uint256 amount) external override returns (bool) {
        require(burners[msg.sender], "forbidden");
        require(amount <= totalSupply, "amount > totalSupply");
        _burn(from, amount);
        emit Burn(from, amount);
        return true;
    }

    function redeem(uint256 amount) external override returns (uint256) {
        require(block.timestamp >= redeemTime, "unredeemable");
        require(balanceOf[msg.sender] >= amount, "not enough balance");

        uint256 totalApeX = IERC20(apeXToken).balanceOf(address(this));
        uint256 apeXAmount = amount * totalApeX / totalSupply / 1000;

        _burn(msg.sender, amount);
        TransferHelper.safeTransfer(apeXToken, msg.sender, apeXAmount);

        emit Redeem(msg.sender, amount, apeXAmount);
        return apeXAmount;
    }

    function transfer(address to, uint256 value) external override returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external override returns (bool) {
        uint256 currentAllowance = allowance[from][msg.sender];
        if (currentAllowance != type(uint256).max) {
            require(currentAllowance >= value, "transfer amount exceeds allowance");
            allowance[from][msg.sender] = currentAllowance - value;
        }
        _transfer(from, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external override returns (bool) {
        _approve(msg.sender, spender, value);
        return true;
    }

    function _mint(address to, uint256 value) internal {
        totalSupply = totalSupply + value;
        balanceOf[to] = balanceOf[to] + value;
        emit Transfer(address(0), to, value);
    }

    function _burn(address from, uint256 value) internal {
        require(balanceOf[from] >= value, "balance of from < value");
        balanceOf[from] = balanceOf[from] - value;
        totalSupply = totalSupply - value;
        emit Transfer(from, address(0), value);
    }

    function _approve(
        address _owner,
        address spender,
        uint256 value
    ) private {
        allowance[_owner][spender] = value;
        emit Approval(_owner, spender, value);
    }

    function _transfer(
        address from,
        address to,
        uint256 value
    ) private {
        require(to != address(0), "can not tranfer to zero address");
        uint256 fromBalance = balanceOf[from];
        require(fromBalance >= value, "transfer amount exceeds balance");
        balanceOf[from] = fromBalance - value;
        balanceOf[to] = balanceOf[to] + value;
        emit Transfer(from, to, value);
    }
}
