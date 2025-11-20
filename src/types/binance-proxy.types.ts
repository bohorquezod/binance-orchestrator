/**
 * Type definitions for Binance Proxy API responses
 * These types match the responses from binance-proxy service
 */

/**
 * Deposit response from Binance API
 */
export interface DepositResponse {
  amount: string;
  coin: string;
  network: string;
  status: number;
  address: string;
  addressTag: string;
  txId: string;
  insertTime: number;
  transferType: number;
  unlockConfirm: number;
  confirmTimes: string;
}

/**
 * Withdrawal response from Binance API
 */
export interface WithdrawResponse {
  id: string;
  amount: string;
  transactionFee: string;
  coin: string;
  status: number;
  address: string;
  addressTag: string;
  txId: string;
  applyTime: string;
  network: string;
  transferType: number;
  info: string;
  confirmNo: number;
  walletType: number;
  txKey: string;
  completeTime: string;
}

