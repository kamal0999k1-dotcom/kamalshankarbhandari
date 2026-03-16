/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeft, MoreHorizontal, Info, ChevronRight, ChevronDown, X, CheckCircle2, Copy, HelpCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [balance, setBalance] = useState(15000000.00);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [username, setUsername] = useState('');
  const [amount, setAmount] = useState('');
  const [lastTx, setLastTx] = useState<any>(null);
  const [transactions, setTransactions] = useState([
    { id: 1, title: 'LIVE rewards', date: '1/4/2026 19:45:36', amount: 1.05, type: 'in' }
  ]);

  const handleTransfer = () => {
    const transferAmount = parseFloat(amount);
    if (!username || isNaN(transferAmount) || transferAmount <= 0 || transferAmount > balance) return;

    setIsProcessing(true);

    // Simulate 1s loading
    setTimeout(() => {
      const newBalance = balance - transferAmount;
      const txDetails = {
        id: Math.random().toString(36).substring(2, 15).toUpperCase(),
        username: username,
        amount: transferAmount,
        date: new Date().toLocaleString('en-US', { 
          month: '2-digit', 
          day: '2-digit', 
          year: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit',
          hour12: true 
        })
      };

      setBalance(newBalance);
      setLastTx(txDetails);
      setTransactions(prev => [
        {
          id: Date.now(),
          title: `Transfer to @${username}`,
          date: txDetails.date,
          amount: transferAmount,
          type: 'out'
        },
        ...prev
      ]);
      
      setIsProcessing(false);
      setShowDetails(true);
    }, 1000);
  };

  // Auto-close details after 2 seconds
  useEffect(() => {
    if (showDetails) {
      const timer = setTimeout(() => {
        setShowDetails(false);
        setIsTransferOpen(false);
        setUsername('');
        setAmount('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showDetails]);

  const isConfirmDisabled = !username || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > balance || isProcessing;

  return (
    <div className="min-h-screen bg-[#F8F8F8] font-sans text-[#161823]">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between bg-white px-4 py-3 border-b border-gray-100">
        <button className="p-1 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold">LIVE rewards</h1>
        <button className="p-1 hover:bg-gray-100 rounded-full transition-colors">
          <MoreHorizontal className="w-6 h-6" />
        </button>
      </header>

      <main className="max-w-md mx-auto pb-8">
        {/* Tabs */}
        <div className="flex p-4 gap-3">
          <button className="flex-1 bg-white rounded-lg p-3 shadow-sm border border-gray-100 text-center">
            <div className="text-sm font-semibold">Available rewards</div>
            <div className="text-xs text-gray-500">US{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </button>
          <button className="flex-1 bg-gray-50 rounded-lg p-3 text-center relative">
            <div className="text-sm font-semibold text-gray-400">Upcoming rewards</div>
            <div className="text-xs text-gray-400">US0.00</div>
            <div className="absolute top-2 right-2 w-2 h-2 bg-[#FE2C55] rounded-full"></div>
          </button>
        </div>

        {/* Main Balance Card */}
        <div className="mx-4 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-4">
          <div className="text-center mb-8">
            <p className="text-sm font-semibold mb-2">Available rewards</p>
            <div className="flex items-baseline justify-center gap-1 overflow-hidden">
              <span className="text-lg font-bold">US</span>
              <span className="text-2xl sm:text-3xl font-bold truncate">
                {balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-center mt-2 text-gray-500 text-sm gap-1">
              <span>≈ EUR{(balance * 0.85).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              <Info className="w-4 h-4" />
            </div>
          </div>

          {/* Buttons Section */}
          <div className="space-y-3 mb-6">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsTransferOpen(true)}
              className="w-full bg-[#FE2C55] text-white py-3.5 rounded-lg font-bold text-lg shadow-sm hover:bg-[#E9294D] transition-colors"
            >
              Transfer
            </motion.button>
            
            <motion.button
              whileTap={{ scale: 0.98 }}
              className="w-full bg-white text-[#161823] py-3.5 rounded-lg font-bold text-lg border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors"
            >
              Withdraw
            </motion.button>
          </div>
        </div>

        {/* Transactions Section */}
        <div className="mx-4 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold mb-6">Transactions</h2>

          {/* Jan 2026 */}
          <div className="mb-8">
            <div className="flex justify-between items-center text-xs text-gray-400 mb-4">
              <button className="flex items-center gap-1 font-medium">
                Mar 2026 <ChevronDown className="w-3 h-3" />
              </button>
              <div className="flex gap-4">
                <span>In: US0.00</span>
                <span>Out: US0.00</span>
              </div>
            </div>

            <div className="space-y-4">
              {transactions.map(tx => (
                <div key={tx.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="font-semibold">{tx.title}</p>
                    <p className="text-xs text-gray-400">{tx.date}</p>
                  </div>
                  <div className={`font-bold ${tx.type === 'in' ? 'text-[#FE2C55]' : 'text-gray-900'}`}>
                    {tx.type === 'in' ? '+' : '-'}US{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Transfer Modal/View */}
      <AnimatePresence>
        {isTransferOpen && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden"
          >
            {/* Conditional Rendering for Form vs Details */}
            {!showDetails ? (
              <>
                <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <button onClick={() => setIsTransferOpen(false)} className="p-1">
                    <X className="w-6 h-6" />
                  </button>
                  <h1 className="text-lg font-bold">Transfer US</h1>
                  <div className="w-8"></div>
                </header>

                <div className="p-6 space-y-6 flex-1 max-w-md mx-auto w-full">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-500 uppercase tracking-wider">TikTok Username</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">@</span>
                      <input
                        type="text"
                        placeholder="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-gray-50 border-none rounded-xl py-4 pl-10 pr-4 text-lg font-medium focus:ring-2 focus:ring-[#FE2C55] transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Amount (US)</label>
                    <div className="relative">
                      {/* $ sign removed as requested */}
                      <input
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-gray-50 border-none rounded-xl py-4 px-4 text-lg font-medium focus:ring-2 focus:ring-[#FE2C55] transition-all"
                      />
                    </div>
                    <p className="text-xs text-gray-400">Available: US{balance.toLocaleString()}</p>
                  </div>

                  <div className="pt-8">
                    <motion.button
                      whileTap={!isConfirmDisabled ? { scale: 0.98 } : {}}
                      onClick={handleTransfer}
                      disabled={isConfirmDisabled}
                      className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-2 ${
                        isConfirmDisabled 
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                          : 'bg-[#FE2C55] text-white hover:bg-[#E9294D]'
                      }`}
                    >
                      {isProcessing ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        'Confirm Transfer'
                      )}
                    </motion.button>
                  </div>
                </div>
              </>
            ) : (
              /* Transaction Details Page */
              <div className="flex flex-col h-full bg-white">
                <header className="flex items-center px-4 py-3 border-b border-gray-100">
                  <button className="p-1">
                    <ArrowLeft className="w-6 h-6" />
                  </button>
                  <h1 className="flex-1 text-center text-lg font-bold pr-8">Transaction details</h1>
                </header>

                <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Status</span>
                    <div className="flex items-center gap-1 text-[#00C49F] font-semibold">
                      <CheckCircle2 className="w-5 h-5 fill-[#00C49F] text-white" />
                      Completed
                    </div>
                  </div>

                  <div className="flex justify-between items-start">
                    <span className="text-gray-500">Transaction type</span>
                    <span className="font-semibold">Payout</span>
                  </div>

                  <div className="flex justify-between items-start">
                    <span className="text-gray-500">Activity type</span>
                    <span className="font-semibold">LIVE rewards</span>
                  </div>

                  <div className="flex justify-between items-start">
                    <span className="text-gray-500">Payment method</span>
                    <div className="text-right">
                      <p className="font-semibold">TikTok(@{lastTx?.username})</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-start">
                    <span className="text-gray-500">Created</span>
                    <span className="font-semibold">{lastTx?.date}</span>
                  </div>

                  <div className="flex justify-between items-start">
                    <span className="text-gray-500">Updated</span>
                    <span className="font-semibold">{lastTx?.date}</span>
                  </div>

                  <div className="flex justify-between items-start">
                    <span className="text-gray-500">Transaction ID</span>
                    <div className="flex items-center gap-1 text-right max-w-[200px]">
                      <span className="font-semibold break-all text-sm">{lastTx?.id}</span>
                      <Copy className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1 text-gray-500">
                      Service fee <HelpCircle className="w-4 h-4" />
                    </div>
                    <span className="font-semibold">US0.00</span>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                    <div className="flex items-center gap-1 text-gray-500">
                      Estimated amount you receive <HelpCircle className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-lg">US{lastTx?.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="p-6 text-center">
                  <button className="flex items-center justify-center gap-1 text-gray-400 text-sm mx-auto">
                    Need help? <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
