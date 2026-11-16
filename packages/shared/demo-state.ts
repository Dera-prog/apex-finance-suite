import { banks, holdings, initialPlans, notifications, stocks, transactions, user, wallet } from './data.js';
import type { HoldingDto, MobileStateResponse, PlanDto, TxnDto } from './api.js';
import { toMinor } from './money.js';

const currencyOf = (symbol: string): 'NGN' | 'USD' =>
  stocks.find((stock) => stock.symbol === symbol)?.currency === 'USD' ? 'USD' : 'NGN';

const toPlanDto = (plan: (typeof initialPlans)[number]): PlanDto => {
  const { balance, target, monthly, ...rest } = plan;
  return {
    ...rest,
    balanceKobo: toMinor(balance),
    targetKobo: target === undefined ? undefined : toMinor(target),
    monthlyKobo: monthly === undefined ? undefined : toMinor(monthly),
  };
};

const toTxnDto = (txn: (typeof transactions)[number]): TxnDto => {
  const { amount, ...rest } = txn;
  return { ...rest, amountKobo: toMinor(amount) };
};

/** The demo account, converted to minor units once, for any surface that serves or falls back to it. */
export function demoMobileState(): MobileStateResponse {
  return {
    account: 'seed',
    profile: {
      name: user.name,
      firstName: user.firstName,
      initials: user.initials,
      phone: user.phone,
      email: user.email,
      bvn: user.bvn,
      nin: user.nin,
      kycLevel: user.kycLevel === 2 ? 2 : 1,
      kycLabel: user.kycLabel,
      address: user.address,
      memberSince: user.memberSince,
      bankAccount: user.bankAccount,
      usStocksAccount: '••• ••• 4471',
      avatarTint: user.avatarTint,
    },
    walletNgnKobo: toMinor(wallet.ngn),
    walletUsdCents: toMinor(wallet.usd),
    plans: initialPlans.map(toPlanDto),
    holdings: holdings.map(
      (holding): HoldingDto => ({
        symbol: holding.symbol,
        units: holding.units,
        currency: currencyOf(holding.symbol),
        avgCostMinor: toMinor(holding.avgCost),
        priceMinor: toMinor(holding.price),
        change: holding.change,
      }),
    ),
    txns: transactions.map(toTxnDto),
    notifications: notifications.map((notification) => ({ ...notification })),
    banks: banks.map((bank) => ({ ...bank })),
  };
}
