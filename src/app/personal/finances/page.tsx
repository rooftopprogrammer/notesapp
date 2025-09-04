'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  getTransactions, 
  getBudgets, 
  addTransaction, 
  addBudget, 
  deleteTransaction, 
  updateBudgetSpentAmount,
  calculateSpentAmount,
  getEMIs,
  getLoans,
  getCreditCards,
  getSubscriptions,
  addEMI,
  updateEMI,
  deleteEMI,
  addLoan,
  addCreditCard,
  addSubscription,
  updateLoan,
  deleteLoan,
  deleteCreditCard,
  updateSubscription,
  deleteSubscription,
  markEMIPaid,
  getDailySpendingData,
  Transaction,
  Budget,
  EMI,
  Loan,
  CreditCard,
  Subscription
} from '@/lib/personalFinances';

export default function PersonalFinances() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [emis, setEmis] = useState<EMI[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [dailySpendingData, setDailySpendingData] = useState<{ date: string; amount: number }[]>([]);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showEditTransaction, setShowEditTransaction] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showAddEMI, setShowAddEMI] = useState(false);
  const [showEditEMI, setShowEditEMI] = useState(false);
  const [editingEMI, setEditingEMI] = useState<EMI | null>(null);
  const [showAddSubscription, setShowAddSubscription] = useState(false);
  const [showEditSubscription, setShowEditSubscription] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  
  const [editEMIForm, setEditEMIForm] = useState({
    name: '',
    principalAmount: '',
    monthlyEMI: '',
    remainingAmount: '',
    interestRate: '',
    tenure: '',
    remainingTenure: '',
    startDate: '',
    nextDueDate: '',
    type: 'home' as 'home' | 'car' | 'personal' | 'education' | 'other',
    status: 'active' as 'active' | 'completed' | 'defaulted'
  });
  
  const [showAddLoan, setShowAddLoan] = useState(false);
  const [showEditLoan, setShowEditLoan] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [showAddCreditCard, setShowAddCreditCard] = useState(false);
  const [showEditCreditCard, setShowEditCreditCard] = useState(false);
  const [editingCreditCard, setEditingCreditCard] = useState<CreditCard | null>(null);
  const [selectedCard, setSelectedCard] = useState('overview');
  const [loading, setLoading] = useState(true);

  const [transactionForm, setTransactionForm] = useState({
    description: '',
    amount: '',
    category: '',
    type: 'expense' as 'income' | 'expense',
    date: new Date().toISOString().split('T')[0]
  });

  const [emiForm, setEmiForm] = useState({
    name: '',
    principalAmount: '',
    monthlyEMI: '',
    remainingAmount: '',
    interestRate: '',
    tenure: '',
    remainingTenure: '',
    startDate: '',
    nextDueDate: '',
    type: 'home' as 'home' | 'car' | 'personal' | 'education' | 'other',
    status: 'active' as 'active' | 'completed' | 'defaulted'
  });

  const [loanForm, setLoanForm] = useState({
    name: '',
    principalAmount: '',
    currentBalance: '',
    interestRate: '',
    lenderName: '',
    icon: '',
    monthlyEMI: '',
    totalTenure: '',
    paidMonths: '0',
    pendingMonths: '',
    nextDueDate: '',
    lastPaidDate: '',
    missedEMIs: '0',
    type: 'personal' as 'personal' | 'business' | 'home' | 'car' | 'education' | 'gold' | 'credit_card' | 'other',
    startDate: '',
    dueDate: '',
    status: 'active' as 'active' | 'closed' | 'overdue'
  });

  const [editLoanForm, setEditLoanForm] = useState({
    name: '',
    lenderName: '',
    icon: '🏦',
    type: 'personal' as 'personal' | 'business' | 'home' | 'car' | 'education' | 'gold' | 'credit_card' | 'other',
    principalAmount: '',
    currentBalance: '',
    interestRate: '',
    totalTenure: '',
    paidMonths: '',
    monthlyEMI: '',
    nextDueDate: '',
    lastPaidDate: '',
    missedEMIs: '',
    startDate: '',
    dueDate: '',
    status: 'active' as 'active' | 'closed' | 'overdue'
  });

  const [creditCardForm, setCreditCardForm] = useState({
    cardName: '',
    bankName: '',
    cardType: 'visa' as 'visa' | 'mastercard' | 'rupay' | 'amex' | 'diners',
    creditLimit: '',
    currentBalance: '',
    availableCredit: '',
    minimumDue: '',
    totalDue: '',
    dueDate: '',
    interestRate: '',
    lastFourDigits: '',
    status: 'active' as 'active' | 'blocked' | 'closed'
  });

  const [editCreditCardForm, setEditCreditCardForm] = useState({
    cardName: '',
    bankName: '',
    cardType: 'visa' as 'visa' | 'mastercard' | 'rupay' | 'amex' | 'diners',
    creditLimit: '',
    currentBalance: '',
    availableCredit: '',
    minimumDue: '',
    totalDue: '',
    dueDate: '',
    interestRate: '',
    lastFourDigits: '',
    status: 'active' as 'active' | 'blocked' | 'closed'
  });

  const [subscriptionForm, setSubscriptionForm] = useState({
    name: '',
    provider: '',
    description: '',
    amount: '',
    currency: 'INR',
    billingCycle: 'monthly' as 'monthly' | 'quarterly' | 'annually' | 'custom',
    customCycleDays: '',
    nextBillingDate: new Date().toISOString().split('T')[0],
    category: 'entertainment',
    icon: '',
    autoRenewal: true,
    reminderDays: '7',
    status: 'active' as 'active' | 'cancelled' | 'paused',
    notes: ''
  });

  // Load data from Firebase/localStorage
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [
          loadedTransactions, 
          loadedBudgets, 
          loadedEMIs, 
          loadedLoans, 
          loadedCreditCards,
          loadedSubscriptions,
          loadedDailyData
        ] = await Promise.all([
          getTransactions(),
          getBudgets(),
          getEMIs(),
          getLoans(),
          getCreditCards(),
          getSubscriptions(),
          getDailySpendingData(7)
        ]);
        setTransactions(loadedTransactions);
        setBudgets(loadedBudgets);
        setEmis(loadedEMIs);
        setLoans(loadedLoans);
        setCreditCards(loadedCreditCards);
        setSubscriptions(loadedSubscriptions);
        setDailySpendingData(loadedDailyData);
      } catch (error) {
        console.error('Error loading finance data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Add transaction
  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionForm.description || !transactionForm.amount || !transactionForm.category) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const newTransaction = await addTransaction({
        description: transactionForm.description,
        amount: parseFloat(transactionForm.amount),
        category: transactionForm.category,
        type: transactionForm.type,
        date: transactionForm.date
      });

      setTransactions([newTransaction, ...transactions]);
      
      // Update budget spent amount if it's an expense
      if (transactionForm.type === 'expense') {
        const budget = budgets.find(b => b.category === transactionForm.category);
        if (budget && budget.id) {
          const newSpentAmount = budget.spentAmount + parseFloat(transactionForm.amount);
          await updateBudgetSpentAmount(budget.id, newSpentAmount);
          setBudgets(budgets.map(b =>
            b.id === budget.id
              ? { ...b, spentAmount: newSpentAmount }
              : b
          ));
        }
      }

      // Reset form
      setTransactionForm({
        description: '',
        amount: '',
        category: '',
        type: 'expense',
        date: new Date().toISOString().split('T')[0]
      });
      setShowAddTransaction(false);
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('Error adding transaction. Please try again.');
    }
  };

  // Edit transaction
  const handleEditTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionForm.description || !transactionForm.amount || !transactionForm.category || !editingTransaction) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      // Delete the old transaction and create a new one (since we don't have update function)
      await deleteTransaction(editingTransaction.id);
      
      const updatedTransaction = await addTransaction({
        description: transactionForm.description,
        amount: parseFloat(transactionForm.amount),
        category: transactionForm.category,
        type: transactionForm.type,
        date: transactionForm.date
      });

      // Update the transactions list
      setTransactions(transactions.map(t => 
        t.id === editingTransaction.id ? updatedTransaction : t
      ));
      
      // Update budget if needed
      if (transactionForm.type === 'expense') {
        const budget = budgets.find(b => b.category === transactionForm.category);
        if (budget && budget.id) {
          const oldAmount = editingTransaction.type === 'expense' ? editingTransaction.amount : 0;
          const newAmount = parseFloat(transactionForm.amount);
          const newSpentAmount = budget.spentAmount - oldAmount + newAmount;
          await updateBudgetSpentAmount(budget.id, newSpentAmount);
          setBudgets(budgets.map(b =>
            b.id === budget.id
              ? { ...b, spentAmount: newSpentAmount }
              : b
          ));
        }
      }

      // Reset form
      setTransactionForm({
        description: '',
        amount: '',
        category: '',
        type: 'expense',
        date: new Date().toISOString().split('T')[0]
      });
      setShowEditTransaction(false);
      setEditingTransaction(null);
    } catch (error) {
      console.error('Error editing transaction:', error);
      alert('Error editing transaction. Please try again.');
    }
  };

  // Start editing transaction
  const startEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setTransactionForm({
      description: transaction.description,
      amount: transaction.amount.toString(),
      category: transaction.category,
      type: transaction.type,
      date: transaction.date
    });
    setShowEditTransaction(true);
  };

  // Add EMI
  const handleAddEMI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emiForm.name || !emiForm.principalAmount || !emiForm.monthlyEMI) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const newEMI = await addEMI({
        name: emiForm.name,
        principalAmount: parseFloat(emiForm.principalAmount),
        monthlyEMI: parseFloat(emiForm.monthlyEMI),
        remainingAmount: parseFloat(emiForm.remainingAmount || emiForm.principalAmount),
        interestRate: parseFloat(emiForm.interestRate),
        tenure: parseInt(emiForm.tenure),
        remainingTenure: parseInt(emiForm.remainingTenure || emiForm.tenure),
        startDate: emiForm.startDate,
        nextDueDate: emiForm.nextDueDate,
        type: emiForm.type,
        status: emiForm.status
      });

      setEmis([newEMI, ...emis]);
      
      // Reset form
      setEmiForm({
        name: '',
        principalAmount: '',
        monthlyEMI: '',
        remainingAmount: '',
        interestRate: '',
        tenure: '',
        remainingTenure: '',
        startDate: '',
        nextDueDate: '',
        type: 'home',
        status: 'active'
      });
      setShowAddEMI(false);
    } catch (error) {
      console.error('Error adding EMI:', error);
      alert('Error adding EMI. Please try again.');
    }
  };

  // Edit EMI
  const handleEditEMI = (emi: EMI) => {
    setEditingEMI(emi);
    setEditEMIForm({
      name: emi.name,
      principalAmount: emi.principalAmount.toString(),
      monthlyEMI: emi.monthlyEMI.toString(),
      remainingAmount: emi.remainingAmount.toString(),
      interestRate: emi.interestRate.toString(),
      tenure: emi.tenure.toString(),
      remainingTenure: emi.remainingTenure.toString(),
      startDate: emi.startDate,
      nextDueDate: emi.nextDueDate,
      type: emi.type,
      status: emi.status
    });
    setShowEditEMI(true);
  };

  // Update EMI
  const handleUpdateEMI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEMI || !editEMIForm.name || !editEMIForm.principalAmount || !editEMIForm.monthlyEMI) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const updatedEMI = await updateEMI(editingEMI.id, {
        name: editEMIForm.name,
        principalAmount: parseFloat(editEMIForm.principalAmount),
        monthlyEMI: parseFloat(editEMIForm.monthlyEMI),
        remainingAmount: parseFloat(editEMIForm.remainingAmount || editEMIForm.principalAmount),
        interestRate: parseFloat(editEMIForm.interestRate),
        tenure: parseInt(editEMIForm.tenure),
        remainingTenure: parseInt(editEMIForm.remainingTenure || editEMIForm.tenure),
        startDate: editEMIForm.startDate,
        nextDueDate: editEMIForm.nextDueDate,
        type: editEMIForm.type,
        status: editEMIForm.status
      });

      setEmis(emis.map(emi => 
        emi.id === editingEMI.id ? updatedEMI : emi
      ));
      
      setShowEditEMI(false);
      setEditingEMI(null);
      
      // Reset form
      setEditEMIForm({
        name: '',
        principalAmount: '',
        monthlyEMI: '',
        remainingAmount: '',
        interestRate: '',
        tenure: '',
        remainingTenure: '',
        startDate: '',
        nextDueDate: '',
        type: 'home',
        status: 'active'
      });
    } catch (error) {
      console.error('Error updating EMI:', error);
      alert('Error updating EMI. Please try again.');
    }
  };

  // Delete EMI
  const handleDeleteEMI = async (emiId: string) => {
    if (!confirm('Are you sure you want to delete this EMI?')) {
      return;
    }

    try {
      await deleteEMI(emiId);
      setEmis(emis.filter(emi => emi.id !== emiId));
    } catch (error) {
      console.error('Error deleting EMI:', error);
      alert('Error deleting EMI. Please try again.');
    }
  };

  // Add Loan
  const handleAddLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanForm.name || !loanForm.principalAmount || !loanForm.lenderName) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const newLoan = await addLoan({
        name: loanForm.name,
        principalAmount: parseFloat(loanForm.principalAmount),
        currentBalance: parseFloat(loanForm.currentBalance || loanForm.principalAmount),
        interestRate: parseFloat(loanForm.interestRate),
        lenderName: loanForm.lenderName,
        icon: loanForm.icon,
        monthlyEMI: parseFloat(loanForm.monthlyEMI),
        totalTenure: parseInt(loanForm.totalTenure),
        paidMonths: parseInt(loanForm.paidMonths),
        pendingMonths: parseInt(loanForm.pendingMonths || loanForm.totalTenure),
        nextDueDate: loanForm.nextDueDate,
        lastPaidDate: loanForm.lastPaidDate,
        missedEMIs: parseInt(loanForm.missedEMIs),
        type: loanForm.type,
        startDate: loanForm.startDate,
        dueDate: loanForm.dueDate,
        status: loanForm.status
      });

      setLoans([newLoan, ...loans]);
      
      // Reset form
      setLoanForm({
        name: '',
        principalAmount: '',
        currentBalance: '',
        interestRate: '',
        lenderName: '',
        icon: '',
        monthlyEMI: '',
        totalTenure: '',
        paidMonths: '0',
        pendingMonths: '',
        nextDueDate: '',
        lastPaidDate: '',
        missedEMIs: '0',
        type: 'personal',
        startDate: '',
        dueDate: '',
        status: 'active'
      });
      setShowAddLoan(false);
    } catch (error) {
      console.error('Error adding loan:', error);
      alert('Error adding loan. Please try again.');
    }
  };

  // Edit Loan
  const handleEditLoan = (loan: Loan) => {
    setEditingLoan(loan);
    setEditLoanForm({
      name: loan.name || '',
      lenderName: loan.lenderName || '',
      icon: loan.icon || '🏦',
      type: loan.type,
      principalAmount: loan.principalAmount.toString(),
      currentBalance: loan.currentBalance.toString(),
      interestRate: loan.interestRate.toString(),
      totalTenure: loan.totalTenure.toString(),
      paidMonths: loan.paidMonths.toString(),
      monthlyEMI: loan.monthlyEMI.toString(),
      nextDueDate: loan.nextDueDate || '',
      lastPaidDate: loan.lastPaidDate || '',
      missedEMIs: loan.missedEMIs?.toString() || '0',
      startDate: loan.startDate || '',
      dueDate: loan.dueDate || '',
      status: loan.status
    });
    setShowEditLoan(true);
  };

  // Update Loan
  const handleUpdateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLoan || !editLoanForm.name || !editLoanForm.lenderName || !editLoanForm.principalAmount) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const updatedLoan = await updateLoan(editingLoan.id!, {
        name: editLoanForm.name,
        principalAmount: parseFloat(editLoanForm.principalAmount),
        currentBalance: parseFloat(editLoanForm.currentBalance) || parseFloat(editLoanForm.principalAmount),
        interestRate: parseFloat(editLoanForm.interestRate) || 0,
        lenderName: editLoanForm.lenderName,
        icon: editLoanForm.icon,
        monthlyEMI: parseFloat(editLoanForm.monthlyEMI) || 0,
        totalTenure: parseInt(editLoanForm.totalTenure) || 0,
        paidMonths: parseInt(editLoanForm.paidMonths) || 0,
        pendingMonths: (parseInt(editLoanForm.totalTenure) || 0) - (parseInt(editLoanForm.paidMonths) || 0),
        nextDueDate: editLoanForm.nextDueDate,
        lastPaidDate: editLoanForm.lastPaidDate,
        missedEMIs: parseInt(editLoanForm.missedEMIs) || 0,
        type: editLoanForm.type,
        startDate: editLoanForm.startDate,
        dueDate: editLoanForm.dueDate,
        status: editLoanForm.status
      });

      if (updatedLoan) {
        setLoans(loans.map(loan => loan.id === editingLoan.id ? updatedLoan : loan));
      }
      
      // Reset form
      setEditLoanForm({
        name: '',
        lenderName: '',
        icon: '🏦',
        type: 'personal',
        principalAmount: '',
        currentBalance: '',
        interestRate: '',
        totalTenure: '',
        paidMonths: '',
        monthlyEMI: '',
        nextDueDate: '',
        lastPaidDate: '',
        missedEMIs: '',
        startDate: '',
        dueDate: '',
        status: 'active'
      });
      setEditingLoan(null);
      setShowEditLoan(false);
    } catch (error) {
      console.error('Error updating loan:', error);
      alert('Error updating loan. Please try again.');
    }
  };

  // Delete Loan
  const handleDeleteLoan = async (loanId: string) => {
    if (!confirm('Are you sure you want to delete this loan?')) {
      return;
    }

    try {
      await deleteLoan(loanId);
      setLoans(loans.filter(loan => loan.id !== loanId));
    } catch (error) {
      console.error('Error deleting loan:', error);
      alert('Error deleting loan. Please try again.');
    }
  };

  // Mark EMI as Paid
  const handleMarkEMIPaid = async (loanId: string) => {
    try {
      const updatedLoan = await markEMIPaid(loanId);
      if (updatedLoan) {
        setLoans(loans.map(loan => loan.id === loanId ? updatedLoan : loan));
      }
    } catch (error) {
      console.error('Error marking EMI as paid:', error);
      alert('Error marking EMI as paid. Please try again.');
    }
  };

  // Add Credit Card
  const handleAddCreditCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditCardForm.cardName || !creditCardForm.bankName || !creditCardForm.creditLimit) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const creditLimit = parseFloat(creditCardForm.creditLimit);
      const currentBalance = parseFloat(creditCardForm.currentBalance || '0');
      const availableCredit = creditLimit - currentBalance;

      const newCard = await addCreditCard({
        cardName: creditCardForm.cardName,
        bankName: creditCardForm.bankName,
        cardType: creditCardForm.cardType,
        creditLimit,
        currentBalance,
        availableCredit,
        minimumDue: parseFloat(creditCardForm.minimumDue || '0'),
        totalDue: parseFloat(creditCardForm.totalDue || '0'),
        dueDate: creditCardForm.dueDate,
        interestRate: parseFloat(creditCardForm.interestRate),
        lastFourDigits: creditCardForm.lastFourDigits,
        status: creditCardForm.status
      });

      setCreditCards([newCard, ...creditCards]);
      
      // Reset form
      setCreditCardForm({
        cardName: '',
        bankName: '',
        cardType: 'visa',
        creditLimit: '',
        currentBalance: '',
        availableCredit: '',
        minimumDue: '',
        totalDue: '',
        dueDate: '',
        interestRate: '',
        lastFourDigits: '',
        status: 'active'
      });
      setShowAddCreditCard(false);
    } catch (error) {
      console.error('Error adding credit card:', error);
      alert('Error adding credit card. Please try again.');
    }
  };

  // Edit Credit Card
  const handleEditCreditCard = (card: CreditCard) => {
    setEditingCreditCard(card);
    setEditCreditCardForm({
      cardName: card.cardName,
      bankName: card.bankName,
      cardType: (card as any).cardType || 'visa',
      creditLimit: card.creditLimit.toString(),
      currentBalance: card.currentBalance.toString(),
      availableCredit: card.availableCredit.toString(),
      minimumDue: card.minimumDue?.toString() || '',
      totalDue: card.totalDue?.toString() || '',
      dueDate: card.dueDate,
      interestRate: card.interestRate?.toString() || '',
      lastFourDigits: card.lastFourDigits,
      status: card.status
    });
    setShowEditCreditCard(true);
  };

  // Update Credit Card
  const handleUpdateCreditCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCreditCard || !editCreditCardForm.cardName || !editCreditCardForm.bankName || !editCreditCardForm.creditLimit) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const creditLimit = parseFloat(editCreditCardForm.creditLimit);
      const currentBalance = parseFloat(editCreditCardForm.currentBalance || '0');
      const availableCredit = creditLimit - currentBalance;

      // We'll need to add updateCreditCard function to the library
      const updatedCard = {
        ...editingCreditCard,
        cardName: editCreditCardForm.cardName,
        bankName: editCreditCardForm.bankName,
        cardType: editCreditCardForm.cardType,
        creditLimit,
        currentBalance,
        availableCredit,
        minimumDue: parseFloat(editCreditCardForm.minimumDue || '0'),
        totalDue: parseFloat(editCreditCardForm.totalDue || '0'),
        dueDate: editCreditCardForm.dueDate,
        interestRate: parseFloat(editCreditCardForm.interestRate || '0'),
        lastFourDigits: editCreditCardForm.lastFourDigits,
        status: editCreditCardForm.status
      };

      setCreditCards(creditCards.map(card => card.id === editingCreditCard.id ? updatedCard : card));
      
      // Reset form
      setEditCreditCardForm({
        cardName: '',
        bankName: '',
        cardType: 'visa',
        creditLimit: '',
        currentBalance: '',
        availableCredit: '',
        minimumDue: '',
        totalDue: '',
        dueDate: '',
        interestRate: '',
        lastFourDigits: '',
        status: 'active'
      });
      setEditingCreditCard(null);
      setShowEditCreditCard(false);
    } catch (error) {
      console.error('Error updating credit card:', error);
      alert('Error updating credit card. Please try again.');
    }
  };

  // Delete Credit Card
  const handleDeleteCreditCard = async (cardId: string) => {
    if (!confirm('Are you sure you want to delete this credit card?')) {
      return;
    }

    try {
      await deleteCreditCard(cardId);
      setCreditCards(creditCards.filter(card => card.id !== cardId));
    } catch (error) {
      console.error('Error deleting credit card:', error);
      alert('Error deleting credit card. Please try again.');
    }
  };

  // Get Card Type Icon
  const getCardTypeIcon = (cardType: string) => {
    switch (cardType) {
      case 'visa':
        return (
          <div className="flex items-center justify-center w-12 h-8 bg-white rounded text-blue-600 font-bold text-sm">
            VISA
          </div>
        );
      case 'mastercard':
        return (
          <div className="flex items-center justify-center w-12 h-8">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              <div className="w-4 h-4 bg-yellow-500 rounded-full -ml-2"></div>
            </div>
          </div>
        );
      case 'rupay':
        return (
          <div className="flex items-center justify-center w-12 h-8 bg-white rounded text-green-600 font-bold text-xs">
            RuPay
          </div>
        );
      case 'amex':
        return (
          <div className="flex items-center justify-center w-12 h-8 bg-white rounded text-blue-800 font-bold text-xs">
            AMEX
          </div>
        );
      case 'diners':
        return (
          <div className="flex items-center justify-center w-12 h-8 bg-white rounded text-gray-800 font-bold text-xs">
            DINERS
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center w-12 h-8 bg-white rounded text-blue-600 font-bold text-sm">
            CARD
          </div>
        );
    }
  };

  // Delete transaction
  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    try {
      const transaction = transactions.find(t => t.id === id);
      await deleteTransaction(id);
      
      // Update budget spent amount if it was an expense
      if (transaction && transaction.type === 'expense') {
        const budget = budgets.find(b => b.category === transaction.category);
        if (budget && budget.id) {
          const newSpentAmount = Math.max(0, budget.spentAmount - transaction.amount);
          await updateBudgetSpentAmount(budget.id, newSpentAmount);
          setBudgets(budgets.map(b =>
            b.id === budget.id
              ? { ...b, spentAmount: newSpentAmount }
              : b
          ));
        }
      }
      
      setTransactions(transactions.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Error deleting transaction. Please try again.');
    }
  };

  // Calculate totals
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  
  // Add EMI, Loan, and Credit Card payments to expenses
  const totalEMIPayments = emis.reduce((sum, emi) => sum + emi.monthlyEMI, 0);
  const totalLoanPayments = loans.reduce((sum, loan) => sum + loan.monthlyEMI, 0);
  const totalCreditCardDue = creditCards.reduce((sum, card) => sum + (card.minimumDue || 0), 0);
  
  const totalFinancialObligations = totalEMIPayments + totalLoanPayments + totalCreditCardDue;
  const adjustedTotalExpenses = totalExpenses + totalFinancialObligations;
  const currentBalance = totalIncome - adjustedTotalExpenses;

  // Get recent transactions (last 5)
  const recentTransactions = transactions.slice(0, 5);

  // Category spending data
  const categorySpending = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  const topCategories = Object.entries(categorySpending)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 8);

  // Get category icon
  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      'Shopping': '🛍️',
      'Food & Dining': '🍽️',
      'Transportation': '🚗',
      'Entertainment': '🎬',
      'Healthcare': '🏥',
      'Vacation': '✈️',
      'Bills & Utilities': '📱',
      'Cafe & Restaurant': '☕',
      'Education': '📚',
      'Other': '📊'
    };
    return icons[category] || '💰';
  };

  // Subscription Handler Functions
  const handleAddSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscriptionForm.name || !subscriptionForm.amount) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate amount is a valid number
    const amount = parseFloat(subscriptionForm.amount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount greater than 0');
      return;
    }

    // Validate reminder days is a valid number
    const reminderDays = parseInt(subscriptionForm.reminderDays);
    if (isNaN(reminderDays) || reminderDays < 0) {
      alert('Please enter a valid number of reminder days');
      return;
    }

    // Validate next billing date
    if (!subscriptionForm.nextBillingDate) {
      alert('Please select a next billing date');
      return;
    }

    // Validate custom cycle days if billing cycle is custom
    let customCycleDays: number | undefined;
    if (subscriptionForm.billingCycle === 'custom') {
      if (!subscriptionForm.customCycleDays) {
        alert('Please enter the number of days for custom billing cycle');
        return;
      }
      customCycleDays = parseInt(subscriptionForm.customCycleDays);
      if (isNaN(customCycleDays) || customCycleDays <= 0) {
        alert('Please enter a valid number of days for custom billing cycle');
        return;
      }
    }

    try {
      const newSubscription = await addSubscription({
        name: subscriptionForm.name,
        provider: subscriptionForm.provider,
        description: subscriptionForm.description,
        amount: amount,
        currency: subscriptionForm.currency,
        billingCycle: subscriptionForm.billingCycle,
        customCycleDays: customCycleDays,
        nextBillingDate: subscriptionForm.nextBillingDate,
        category: subscriptionForm.category,
        icon: subscriptionForm.icon,
        autoRenewal: subscriptionForm.autoRenewal,
        reminderDays: reminderDays,
        status: subscriptionForm.status,
        notes: subscriptionForm.notes
      });

      setSubscriptions([newSubscription, ...subscriptions]);
      
      // Also add as a transaction to align with overview tab
      await addTransaction({
        description: `Subscription: ${subscriptionForm.name}`,
        amount: amount,
        category: subscriptionForm.category,
        type: 'expense',
        date: new Date().toISOString().split('T')[0]
      });
      
      // Reset form
      setSubscriptionForm({
        name: '',
        provider: '',
        description: '',
        amount: '',
        currency: 'INR',
        billingCycle: 'monthly',
        customCycleDays: '',
        nextBillingDate: new Date().toISOString().split('T')[0],
        category: 'entertainment',
        icon: '',
        autoRenewal: true,
        reminderDays: '7',
        status: 'active',
        notes: ''
      });
      setShowAddSubscription(false);
    } catch (error) {
      console.error('Error adding subscription:', error);
      alert(`Error adding subscription: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    }
  };

  const handleEditSubscription = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    setShowEditSubscription(true);
  };

  const handleUpdateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubscription) return;

    try {
      const updatedSubscription = await updateSubscription(editingSubscription.id!, editingSubscription);
      
      if (updatedSubscription) {
        setSubscriptions(subscriptions.map(sub => 
          sub.id === editingSubscription.id ? updatedSubscription : sub
        ));
        
        // Add transaction if subscription is active
        if (editingSubscription.status === 'active') {
          await addTransaction({
            description: `Subscription Updated: ${editingSubscription.name}`,
            amount: editingSubscription.amount,
            category: editingSubscription.category,
            type: 'expense',
            date: new Date().toISOString().split('T')[0]
          });
        }
      }
      
      setShowEditSubscription(false);
      setEditingSubscription(null);
    } catch (error) {
      console.error('Error updating subscription:', error);
      alert('Error updating subscription. Please try again.');
    }
  };

  const handleDeleteSubscription = async (subscriptionId: string) => {
    if (!confirm('Are you sure you want to delete this subscription?')) {
      return;
    }

    try {
      await deleteSubscription(subscriptionId);
      setSubscriptions(subscriptions.filter(sub => sub.id !== subscriptionId));
    } catch (error) {
      console.error('Error deleting subscription:', error);
      alert('Error deleting subscription. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/personal"
                className="p-2 rounded-lg bg-white shadow hover:shadow-md transition-shadow"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Good Evening, Finance Dashboard</h1>
            </div>
            <p className="text-gray-500">Personal finance management system</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button className="p-2 rounded-lg bg-white shadow hover:shadow-md transition-shadow">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM8 7H3l5-5v5z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="col-span-3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Finance Dashboard</h3>
              </div>
              <nav className="p-2">
                <button
                  onClick={() => setSelectedCard('overview')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    selectedCard === 'overview' ? 'bg-red-500 text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Overview
                </button>
                <button
                  onClick={() => setSelectedCard('emis')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    selectedCard === 'emis' ? 'bg-red-500 text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  EMIs
                </button>
                <button
                  onClick={() => setSelectedCard('loans')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    selectedCard === 'loans' ? 'bg-red-500 text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 0h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v2" />
                  </svg>
                  Loans
                </button>
                <button
                  onClick={() => setSelectedCard('creditcards')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    selectedCard === 'creditcards' ? 'bg-red-500 text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Credit Cards
                </button>
                <button
                  onClick={() => setSelectedCard('subscriptions')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    selectedCard === 'subscriptions' ? 'bg-red-500 text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" />
                  </svg>
                  Subscriptions
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="col-span-9">
            {selectedCard === 'overview' && (
              <>
                {/* Card Overview */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  {/* My Card */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-gray-900">My Card</h2>
                      <button 
                        onClick={() => setShowAddTransaction(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add New Transaction
                      </button>
                    </div>

                    {/* Credit Card */}
                    <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 text-white overflow-hidden">
                      <div className="absolute top-4 right-4 text-white/80 text-lg font-bold">12/26</div>
                      <div className="mb-8">
                        <div className="text-2xl font-bold tracking-wider">VISA</div>
                      </div>
                      <div className="mb-4">
                        <div className="text-sm text-white/70 mb-1">Balance</div>
                        <div className="text-2xl font-bold">₹{currentBalance.toLocaleString()}</div>
                      </div>
                      <div className="flex justify-between items-end">
                        <div className="text-sm text-white/70">**** 6273</div>
                      </div>
                      <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full"></div>
                      <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/5 rounded-full"></div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4 mt-4">
                      <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4 4m4-4l-4-4M4 7h4m0 0V3m0 4v4" />
                        </svg>
                        Transfers
                      </button>
                      <button className="flex-1 flex items-center justify-center gap-2 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                        Pay Bill
                      </button>
                    </div>
                  </div>

                  {/* Monthly Overview Chart */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-gray-900">Monthly Overview</h2>
                      <div className="text-sm text-gray-500">Last 7 Days</div>
                    </div>

                    <div className="bg-white rounded-xl p-6 border border-gray-100">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="text-2xl font-bold text-gray-900">₹{adjustedTotalExpenses.toLocaleString()}</div>
                          <div className="text-sm text-gray-500">Total Spent This Week (including EMI/Loans)</div>
                        </div>
                      </div>

                      {/* Real Data Chart */}
                      <div className="h-32 flex items-end gap-2">
                        {dailySpendingData.map((data, index) => {
                          const maxAmount = Math.max(...dailySpendingData.map(d => d.amount), 1);
                          const height = (data.amount / maxAmount) * 100;
                          return (
                            <div
                              key={index}
                              className="flex-1 bg-red-500 rounded-t relative group"
                              style={{ height: `${Math.max(height, 5)}%` }}
                              title={`${new Date(data.date).toLocaleDateString()}: ₹${data.amount.toLocaleString()}`}
                            >
                              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                ₹{data.amount.toLocaleString()}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-2">
                        {dailySpendingData.map((data, index) => (
                          <span key={index}>
                            {new Date(data.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Section */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Recent Transactions */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-gray-900">Recent Transaction</h2>
                      <button className="text-red-500 text-sm hover:text-red-600">See All</button>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                      {loading ? (
                        <div className="p-6 text-center">
                          <div className="animate-spin w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                          <p className="text-gray-500 text-sm">Loading transactions...</p>
                        </div>
                      ) : recentTransactions.length === 0 ? (
                        <div className="p-6 text-center">
                          <p className="text-gray-500 text-sm">No transactions yet</p>
                        </div>
                      ) : (
                        recentTransactions.map((transaction) => (
                          <div key={transaction.id} className="flex items-center justify-between p-4 border-b border-gray-50 last:border-b-0">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                <span className="text-lg">{getCategoryIcon(transaction.category)}</span>
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{transaction.description}</div>
                                <div className="text-xs text-gray-500">
                                  {new Date(transaction.date).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className={`font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-gray-900'}`}>
                                {transaction.type === 'income' ? '+' : '-'}₹{transaction.amount.toLocaleString()}
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => startEditTransaction(transaction)}
                                  className="p-1 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                  title="Edit transaction"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteTransaction(transaction.id)}
                                  className="p-1 text-red-500 hover:text-red-600 hover:bg-red-50 rounded"
                                  title="Delete transaction"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Total Spend */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-gray-900">Total Spend</h2>
                      <button className="text-red-500 text-sm hover:text-red-600">See All</button>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-100">
                      {topCategories.map(([category, amount]) => (
                        <div key={category} className="flex items-center justify-between p-4 border-b border-gray-50 last:border-b-0">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                              <span className="text-sm">{getCategoryIcon(category)}</span>
                            </div>
                            <span className="font-medium text-gray-900">{category}</span>
                          </div>
                          <span className="font-semibold text-gray-900">₹{amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Financial Obligations Summary */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Monthly Financial Obligations</h2>
                    <span className="text-sm text-gray-500">Total: ₹{totalFinancialObligations.toLocaleString()}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {/* EMI Summary */}
                    <div className="bg-white rounded-xl border border-gray-100 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-700">EMIs</h3>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{emis.length}</span>
                      </div>
                      <div className="text-xl font-bold text-gray-900">₹{totalEMIPayments.toLocaleString()}</div>
                      <div className="text-xs text-gray-500 mt-1">Monthly Payment</div>
                    </div>

                    {/* Loans Summary */}
                    <div className="bg-white rounded-xl border border-gray-100 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-700">Loans</h3>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">{loans.length}</span>
                      </div>
                      <div className="text-xl font-bold text-gray-900">₹{totalLoanPayments.toLocaleString()}</div>
                      <div className="text-xs text-gray-500 mt-1">Monthly EMI</div>
                    </div>

                    {/* Credit Cards Summary */}
                    <div className="bg-white rounded-xl border border-gray-100 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-700">Credit Cards</h3>
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">{creditCards.length}</span>
                      </div>
                      <div className="text-xl font-bold text-gray-900">₹{totalCreditCardDue.toLocaleString()}</div>
                      <div className="text-xs text-gray-500 mt-1">Minimum Due</div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* EMI Section */}
            {selectedCard === 'emis' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">EMI Management</h2>
                  <button 
                    onClick={() => setShowAddEMI(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add New EMI
                  </button>
                </div>

                {/* EMI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {emis.map((emi) => {
                    // Calculate interest breakdown
                    const totalPayment = emi.monthlyEMI * emi.tenure;
                    const totalInterest = totalPayment - emi.principalAmount;
                    const principalPercentage = (emi.principalAmount / totalPayment) * 100;
                    const interestPercentage = (totalInterest / totalPayment) * 100;
                    const completedPercentage = ((emi.tenure - emi.remainingTenure) / emi.tenure) * 100;

                    return (
                      <div key={emi.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold text-lg text-gray-900">{emi.name}</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              emi.status === 'active' ? 'bg-green-100 text-green-800' :
                              emi.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {emi.status.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 capitalize">{emi.type} Loan</p>
                        </div>

                        {/* Main Content */}
                        <div className="p-6">
                          <div className="grid grid-cols-2 gap-6">
                            {/* Pie Chart Section */}
                            <div className="flex flex-col items-center">
                              <div className="relative w-24 h-24 mb-3">
                                <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                                  {/* Background circle */}
                                  <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="#E5E7EB"
                                    strokeWidth="2"
                                  />
                                  {/* Principal amount arc */}
                                  <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="#3B82F6"
                                    strokeWidth="2"
                                    strokeDasharray={`${principalPercentage}, 100`}
                                  />
                                  {/* Interest arc */}
                                  <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="#EF4444"
                                    strokeWidth="2"
                                    strokeDasharray={`${interestPercentage}, 100`}
                                    strokeDashoffset={`-${principalPercentage}`}
                                  />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-xs font-bold text-gray-700">{principalPercentage.toFixed(1)}%</span>
                                </div>
                              </div>
                              
                              {/* Legend */}
                              <div className="space-y-1 text-xs">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                                  <span className="text-gray-600">Principal</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
                                  <span className="text-gray-600">Interest</span>
                                </div>
                              </div>
                            </div>

                            {/* EMI Details */}
                            <div className="space-y-4">
                              <div>
                                <p className="text-sm font-medium text-gray-700 mb-1">Loan EMI</p>
                                <p className="text-xl font-bold text-gray-900">₹ {emi.monthlyEMI.toLocaleString()}</p>
                              </div>
                              
                              <div>
                                <p className="text-sm text-gray-600 mb-1">Total Interest Payable</p>
                                <p className="text-lg font-semibold text-red-600">₹ {totalInterest.toLocaleString()}</p>
                              </div>
                              
                              <div>
                                <p className="text-sm text-gray-600 mb-1">Total Payment</p>
                                <p className="text-sm text-gray-500">(Principal + Interest)</p>
                                <p className="text-lg font-semibold text-gray-900">₹ {totalPayment.toLocaleString()}</p>
                              </div>
                            </div>
                          </div>

                          {/* Additional Info */}
                          <div className="mt-6 pt-4 border-t border-gray-100">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Principal Amount:</span>
                                <p className="font-semibold text-gray-900">₹{emi.principalAmount.toLocaleString()}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Remaining:</span>
                                <p className="font-semibold text-gray-900">₹{emi.remainingAmount.toLocaleString()}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Next Due:</span>
                                <p className="font-semibold text-gray-900">{new Date(emi.nextDueDate).toLocaleDateString()}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Tenure Left:</span>
                                <p className="font-semibold text-gray-900">{emi.remainingTenure} months</p>
                              </div>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="mt-4">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm text-gray-600">Progress</span>
                              <span className="text-sm font-semibold text-gray-900">{completedPercentage.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div
                                className="bg-gradient-to-r from-green-400 to-green-600 h-2.5 rounded-full transition-all duration-300"
                                style={{ width: `${completedPercentage}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          {emi.status === 'active' && (
                            <div className="mt-6 space-y-3">
                              <div className="flex gap-3">
                                <button className="flex-1 bg-green-500 text-white py-2.5 rounded-lg hover:bg-green-600 transition-colors font-medium text-sm">
                                  Mark as Paid
                                </button>
                                <button className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm">
                                  View Details
                                </button>
                              </div>
                              <div className="flex gap-3">
                                <button 
                                  onClick={() => handleEditEMI(emi)}
                                  className="flex-1 bg-blue-500 text-white py-2.5 rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  Edit
                                </button>
                                <button 
                                  onClick={() => handleDeleteEMI(emi.id!)}
                                  className="flex-1 bg-red-500 text-white py-2.5 rounded-lg hover:bg-red-600 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Completed EMI - Still show edit/delete options */}
                          {emi.status === 'completed' && (
                            <div className="mt-6 space-y-3">
                              <div className="bg-green-50 border border-green-200 text-green-800 py-2.5 rounded-lg text-center font-medium text-sm">
                                ✓ EMI Completed
                              </div>
                              <div className="flex gap-3">
                                <button 
                                  onClick={() => handleEditEMI(emi)}
                                  className="flex-1 bg-blue-500 text-white py-2.5 rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  Edit
                                </button>
                                <button 
                                  onClick={() => handleDeleteEMI(emi.id!)}
                                  className="flex-1 bg-red-500 text-white py-2.5 rounded-lg hover:bg-red-600 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {emis.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No EMIs Found</h3>
                      <p className="text-gray-500 mb-4">You haven&apos;t added any EMIs yet. Start by adding your first EMI.</p>
                      <button 
                        onClick={() => setShowAddEMI(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Your First EMI
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Loans Section */}
            {selectedCard === 'loans' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Loan Management</h2>
                  <button 
                    onClick={() => setShowAddLoan(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add New Loan
                  </button>
                </div>

                {/* Loan Cards - New Design */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {loans.map((loan) => (
                    <div key={loan.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 group relative">
                      {/* Hover Actions */}
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-2">
                        <button
                          onClick={() => handleEditLoan(loan)}
                          className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                          title="Edit Loan"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteLoan(loan.id!)}
                          className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                          title="Delete Loan"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      {/* Bank Header */}
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="font-semibold text-gray-900 text-lg">{loan.lenderName}</h3>
                        <div className="w-12 h-8 rounded flex items-center justify-center">
                          {loan.icon ? (
                            loan.icon.startsWith('http') ? (
                              <img src={loan.icon} alt={loan.lenderName} className="w-full h-full object-contain rounded" />
                            ) : (
                              <span className="text-2xl">{loan.icon}</span>
                            )
                          ) : (
                            <div className="w-full h-full bg-red-500 rounded flex items-center justify-center">
                              <div className="w-2 h-4 bg-white rounded-sm"></div>
                              <div className="w-2 h-4 bg-white rounded-sm ml-1"></div>
                              <div className="w-2 h-4 bg-white rounded-sm ml-1"></div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Outstanding Amount and Monthly EMI */}
                      <div className="grid grid-cols-2 gap-6 mb-4">
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Outstanding Amount</p>
                          <p className="text-xl font-bold text-gray-900">₹{loan.currentBalance.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Monthly EMI</p>
                          <p className="text-xl font-bold text-gray-900">₹{loan.monthlyEMI?.toLocaleString() || 'N/A'}</p>
                        </div>
                      </div>

                      {/* Payment Progress */}
                      <div className="grid grid-cols-2 gap-6 mb-4">
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Months Paid</p>
                          <p className="text-lg font-semibold text-green-600">{loan.paidMonths || 0} / {loan.totalTenure || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Pending Months</p>
                          <p className="text-lg font-semibold text-orange-600">{loan.pendingMonths || 'N/A'}</p>
                        </div>
                      </div>

                      {/* Next Due Date and Missed EMIs */}
                      <div className="grid grid-cols-2 gap-6 mb-6">
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Next Due Date</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {loan.nextDueDate ? new Date(loan.nextDueDate).toLocaleDateString() : 'Not set'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Missed EMIs</p>
                          <p className={`text-sm font-semibold ${loan.missedEMIs && loan.missedEMIs > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {loan.missedEMIs || 0}
                          </p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="flex justify-between text-xs text-gray-500 mb-2">
                          <span>Progress</span>
                          <span>{loan.paidMonths && loan.totalTenure ? Math.round((loan.paidMonths / loan.totalTenure) * 100) : 0}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${loan.paidMonths && loan.totalTenure ? (loan.paidMonths / loan.totalTenure) * 100 : 0}%` 
                            }}
                          ></div>
                        </div>
                      </div>

                      {/* Mark as Paid Button */}
                      {loan.status === 'active' && (
                        <button
                          onClick={() => handleMarkEMIPaid(loan.id!)}
                          className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors font-medium"
                        >
                          Mark EMI as Paid
                        </button>
                      )}
                      
                      {loan.status === 'closed' && (
                        <div className="w-full bg-green-100 text-green-800 py-2 rounded-lg text-center font-medium">
                          Loan Completed ✓
                        </div>
                      )}
                      
                      {loan.status === 'overdue' && (
                        <div className="w-full bg-red-100 text-red-800 py-2 rounded-lg text-center font-medium">
                          Overdue - Please Pay
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* No loans found message */}
                  {loans.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Loans Found</h3>
                      <p className="text-gray-500 mb-4">You haven&apos;t added any loans yet. Start by adding your first loan.</p>
                      <button 
                        onClick={() => setShowAddLoan(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Your First Loan
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Credit Cards Section */}
            {selectedCard === 'creditcards' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Credit Card Management</h2>
                  <button 
                    onClick={() => setShowAddCreditCard(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add New Card
                  </button>
                </div>

                {/* Credit Card Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {creditCards.map((card) => (
                    <div key={card.id} className="relative group">
                      {/* Credit Card */}
                      <div className="bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900 rounded-2xl p-6 text-white relative overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                        {/* Hover Actions */}
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-2 z-10">
                          <button
                            onClick={() => handleEditCreditCard(card)}
                            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                            title="Edit Card"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteCreditCard(card.id!)}
                            className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                            title="Delete Card"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>

                        {/* Card Type Icon */}
                        <div className="absolute top-4 right-4 group-hover:opacity-0 transition-opacity duration-300">
                          {getCardTypeIcon((card as any).cardType || 'visa')}
                        </div>

                        {/* Card Chip */}
                        <div className="absolute top-4 left-4">
                          <div className="w-8 h-6 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-sm flex items-center justify-center">
                            <div className="w-2 h-2 bg-yellow-600 rounded-full"></div>
                          </div>
                        </div>

                        {/* Card Number */}
                        <div className="mt-12 mb-6">
                          <p className="text-lg font-mono tracking-widest">
                            {card.lastFourDigits ? 
                              `${card.lastFourDigits.slice(0,4)} ${card.lastFourDigits.slice(4,8) || '2461'} ${card.lastFourDigits.slice(8,12) || '5320'} ${card.lastFourDigits}` :
                              '8923 2461 5320 7642'
                            }
                          </p>
                        </div>

                        {/* Card Details */}
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-xs text-gray-300 mb-1">Name</p>
                            <p className="text-sm font-semibold">{card.cardName || 'Card Holder'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-300 mb-1">Exp Date</p>
                            <p className="text-sm font-semibold">
                              {card.dueDate ? new Date(card.dueDate).toLocaleDateString('en-US', {month: '2-digit', year: '2-digit'}) : '07/28'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-300 mb-1">CVV</p>
                            <p className="text-sm font-semibold">***</p>
                          </div>
                        </div>

                        {/* Decorative Elements */}
                        <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/5 rounded-full"></div>
                        <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/3 rounded-full"></div>
                      </div>

                      {/* Card Details Panel */}
                      <div className="mt-4 bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-gray-900">{card.bankName}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            card.status === 'active' ? 'bg-green-100 text-green-800' :
                            card.status === 'blocked' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {card.status.toUpperCase()}
                          </span>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Current Balance:</span>
                            <span className="font-semibold text-red-600">₹{card.currentBalance.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Credit Limit:</span>
                            <span className="font-semibold text-gray-900">₹{card.creditLimit.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Available Credit:</span>
                            <span className="font-semibold text-green-600">₹{card.availableCredit.toLocaleString()}</span>
                          </div>
                          {card.minimumDue && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Minimum Due:</span>
                              <span className="font-semibold text-orange-600">₹{card.minimumDue.toLocaleString()}</span>
                            </div>
                          )}
                          {card.totalDue && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Total Due:</span>
                              <span className="font-semibold text-red-600">₹{card.totalDue.toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-500">Due Date:</span>
                            <span className="font-semibold text-gray-900">{new Date(card.dueDate).toLocaleDateString()}</span>
                          </div>
                          {card.interestRate && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Interest Rate:</span>
                              <span className="font-semibold text-gray-900">{card.interestRate}% p.a.</span>
                            </div>
                          )}
                        </div>

                        {/* Usage Progress Bar */}
                        <div className="mt-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-gray-500">Credit Usage</span>
                            <span className="text-xs font-semibold text-gray-700">
                              {((card.currentBalance / card.creditLimit) * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                (card.currentBalance / card.creditLimit) * 100 > 80 ? 'bg-red-500' :
                                (card.currentBalance / card.creditLimit) * 100 > 60 ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`}
                              style={{
                                width: `${Math.min((card.currentBalance / card.creditLimit) * 100, 100)}%`
                              }}
                            ></div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-4 flex gap-2">
                          <button className="flex-1 bg-blue-500 text-white py-2 px-3 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium">
                            Pay Bill
                          </button>
                          <button className="flex-1 border border-gray-300 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
                            View Statement
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {creditCards.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Credit Cards Found</h3>
                      <p className="text-gray-500 mb-4">You haven&apos;t added any credit cards yet. Start by adding your first card.</p>
                      <button 
                        onClick={() => setShowAddCreditCard(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Your First Card
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Subscriptions Section */}
            {selectedCard === 'subscriptions' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Subscription Management</h2>
                  <button 
                    onClick={() => setShowAddSubscription(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Subscription
                  </button>
                </div>

                <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-4 text-white">
                      <h3 className="text-sm font-medium opacity-90">Total Monthly Spend</h3>
                      <p className="text-2xl font-bold mt-1">
                        ₹{subscriptions
                          .filter(sub => sub.status === 'active')
                          .reduce((total, subscription) => {
                            let monthlyAmount = subscription.amount;
                            switch (subscription.billingCycle) {
                              case 'quarterly': monthlyAmount = subscription.amount / 3; break;
                              case 'annually': monthlyAmount = subscription.amount / 12; break;
                              case 'custom':
                                if (subscription.customCycleDays) {
                                  monthlyAmount = (subscription.amount * 30) / subscription.customCycleDays;
                                }
                                break;
                            }
                            return total + monthlyAmount;
                          }, 0)
                          .toFixed(2)
                        }
                      </p>
                    </div>
                    <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-4 text-white">
                      <h3 className="text-sm font-medium opacity-90">Active Subscriptions</h3>
                      <p className="text-2xl font-bold mt-1">
                        {subscriptions.filter(s => s.status === 'active').length}
                      </p>
                    </div>
                    <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-4 text-white">
                      <h3 className="text-sm font-medium opacity-90">This Month</h3>
                      <p className="text-2xl font-bold mt-1">
                        {subscriptions.filter(s => {
                          const today = new Date();
                          const nextDate = new Date(s.nextBillingDate);
                          const diffTime = nextDate.getTime() - today.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          return diffDays <= 30 && diffDays >= 0 && s.status === 'active';
                        }).length}
                      </p>
                      <p className="text-xs opacity-90">Due soon</p>
                    </div>
                  </div>

                  {subscriptions.length === 0 ? (
                    <div className="text-center py-8">
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No subscriptions yet</h3>
                      <p className="text-gray-500 mb-4">Start tracking your recurring payments and subscriptions</p>
                      <button 
                        onClick={() => setShowAddSubscription(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      >
                        Add your first subscription
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {subscriptions.slice(0, 6).map(subscription => (
                        <div key={subscription.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex gap-3">
                            <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 bg-gray-200 flex items-center justify-center">
                              {subscription.category === 'entertainment' && '🎬'}
                              {subscription.category === 'streaming' && '📺'}
                              {subscription.category === 'music' && '🎵'}
                              {subscription.category === 'gaming' && '🎮'}
                              {subscription.category === 'software' && '💻'}
                              {subscription.category === 'cloud' && '☁️'}
                              {subscription.category === 'news' && '📰'}
                              {subscription.category === 'fitness' && '💪'}
                              {subscription.category === 'education' && '📚'}
                              {!['entertainment', 'streaming', 'music', 'gaming', 'software', 'cloud', 'news', 'fitness', 'education'].includes(subscription.category) && '📦'}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">{subscription.name}</h3>
                              <p className="text-sm text-gray-600">{subscription.provider}</p>
                              <div className="flex justify-between items-center mt-2">
                                <span className="font-bold text-lg">₹{subscription.amount.toFixed(2)}</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  subscription.status === 'active' ? 'bg-green-100 text-green-800' : 
                                  subscription.status === 'paused' ? 'bg-yellow-100 text-yellow-800' : 
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {subscription.status}
                                </span>
                              </div>
                              <div className="flex justify-between items-center mt-3">
                                <button 
                                  onClick={() => handleEditSubscription(subscription)}
                                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                >
                                  Edit
                                </button>
                                <button 
                                  onClick={() => handleDeleteSubscription(subscription.id!)}
                                  className="text-red-600 hover:text-red-700 text-sm font-medium"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {subscriptions.length > 6 && (
                    <div className="mt-6 text-center">
                      <Link 
                        href="/personal/finances/subscriptions"
                        className="text-red-600 hover:text-red-700 font-medium"
                      >
                        View all {subscriptions.length} subscriptions →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Add Transaction Modal */}
        {showAddTransaction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New Transaction</h2>
              <form onSubmit={handleAddTransaction}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <input
                      type="text"
                      required
                      value={transactionForm.description}
                      onChange={(e) => setTransactionForm({...transactionForm, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Enter description"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={transactionForm.amount}
                      onChange={(e) => setTransactionForm({...transactionForm, amount: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      required
                      value={transactionForm.category}
                      onChange={(e) => setTransactionForm({...transactionForm, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="">Select Category</option>
                      <option value="Shopping">Shopping</option>
                      <option value="Food & Dining">Food & Dining</option>
                      <option value="Transportation">Transportation</option>
                      <option value="Entertainment">Entertainment</option>
                      <option value="Healthcare">Healthcare</option>
                      <option value="Vacation">Vacation</option>
                      <option value="Bills & Utilities">Bills & Utilities</option>
                      <option value="Cafe & Restaurant">Cafe & Restaurant</option>
                      <option value="Education">Education</option>
                      <option value="Salary">Salary</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                    <select
                      value={transactionForm.type}
                      onChange={(e) => setTransactionForm({...transactionForm, type: e.target.value as 'income' | 'expense'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={transactionForm.date}
                      onChange={(e) => setTransactionForm({...transactionForm, date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Add Transaction
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddTransaction(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Transaction Modal */}
        {showEditTransaction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Edit Transaction</h2>
              <form onSubmit={handleEditTransaction}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <input
                      type="text"
                      required
                      value={transactionForm.description}
                      onChange={(e) => setTransactionForm({...transactionForm, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Enter description"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={transactionForm.amount}
                      onChange={(e) => setTransactionForm({...transactionForm, amount: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      required
                      value={transactionForm.category}
                      onChange={(e) => setTransactionForm({...transactionForm, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="">Select Category</option>
                      <option value="Shopping">Shopping</option>
                      <option value="Food & Dining">Food & Dining</option>
                      <option value="Transportation">Transportation</option>
                      <option value="Entertainment">Entertainment</option>
                      <option value="Healthcare">Healthcare</option>
                      <option value="Vacation">Vacation</option>
                      <option value="Bills & Utilities">Bills & Utilities</option>
                      <option value="Cafe & Restaurant">Cafe & Restaurant</option>
                      <option value="Education">Education</option>
                      <option value="Salary">Salary</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                    <select
                      value={transactionForm.type}
                      onChange={(e) => setTransactionForm({...transactionForm, type: e.target.value as 'income' | 'expense'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={transactionForm.date}
                      onChange={(e) => setTransactionForm({...transactionForm, date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Update Transaction
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditTransaction(false);
                      setEditingTransaction(null);
                      setTransactionForm({
                        description: '',
                        amount: '',
                        category: '',
                        type: 'expense',
                        date: new Date().toISOString().split('T')[0]
                      });
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add EMI Modal */}
        {showAddEMI && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New EMI</h2>
              <form onSubmit={handleAddEMI}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">EMI Name</label>
                    <input
                      type="text"
                      required
                      value={emiForm.name}
                      onChange={(e) => setEmiForm({...emiForm, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="e.g., Home Loan EMI"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Principal Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={emiForm.principalAmount}
                      onChange={(e) => setEmiForm({...emiForm, principalAmount: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Total loan amount"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Monthly EMI</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={emiForm.monthlyEMI}
                      onChange={(e) => setEmiForm({...emiForm, monthlyEMI: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Monthly EMI amount"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Remaining Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      value={emiForm.remainingAmount}
                      onChange={(e) => setEmiForm({...emiForm, remainingAmount: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Outstanding amount"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Interest Rate (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={emiForm.interestRate}
                      onChange={(e) => setEmiForm({...emiForm, interestRate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Annual interest rate"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Total Tenure (months)</label>
                      <input
                        type="number"
                        value={emiForm.tenure}
                        onChange={(e) => setEmiForm({...emiForm, tenure: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Total months"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Remaining Tenure</label>
                      <input
                        type="number"
                        value={emiForm.remainingTenure}
                        onChange={(e) => setEmiForm({...emiForm, remainingTenure: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Months left"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={emiForm.startDate}
                        onChange={(e) => setEmiForm({...emiForm, startDate: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Next Due Date</label>
                      <input
                        type="date"
                        value={emiForm.nextDueDate}
                        onChange={(e) => setEmiForm({...emiForm, nextDueDate: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">EMI Type</label>
                    <select
                      value={emiForm.type}
                      onChange={(e) => setEmiForm({...emiForm, type: e.target.value as 'home' | 'car' | 'personal' | 'other'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="home">Home Loan</option>
                      <option value="car">Car Loan</option>
                      <option value="personal">Personal Loan</option>
                      <option value="education">Education Loan</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Add EMI
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddEMI(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit EMI Modal */}
        {showEditEMI && editingEMI && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Edit EMI</h2>
              <form onSubmit={handleUpdateEMI}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">EMI Name</label>
                    <input
                      type="text"
                      required
                      value={editEMIForm.name}
                      onChange={(e) => setEditEMIForm({...editEMIForm, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Home Loan EMI"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Principal Amount</label>
                      <input
                        type="number"
                        required
                        value={editEMIForm.principalAmount}
                        onChange={(e) => setEditEMIForm({...editEMIForm, principalAmount: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="50000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Monthly EMI</label>
                      <input
                        type="number"
                        required
                        value={editEMIForm.monthlyEMI}
                        onChange={(e) => setEditEMIForm({...editEMIForm, monthlyEMI: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="5000"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Remaining Amount</label>
                      <input
                        type="number"
                        value={editEMIForm.remainingAmount}
                        onChange={(e) => setEditEMIForm({...editEMIForm, remainingAmount: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="30000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Interest Rate (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editEMIForm.interestRate}
                        onChange={(e) => setEditEMIForm({...editEMIForm, interestRate: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="8.5"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tenure (months)</label>
                      <input
                        type="number"
                        value={editEMIForm.tenure}
                        onChange={(e) => setEditEMIForm({...editEMIForm, tenure: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="24"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Remaining Tenure</label>
                      <input
                        type="number"
                        value={editEMIForm.remainingTenure}
                        onChange={(e) => setEditEMIForm({...editEMIForm, remainingTenure: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="12"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={editEMIForm.startDate}
                        onChange={(e) => setEditEMIForm({...editEMIForm, startDate: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Next Due Date</label>
                      <input
                        type="date"
                        value={editEMIForm.nextDueDate}
                        onChange={(e) => setEditEMIForm({...editEMIForm, nextDueDate: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">EMI Type</label>
                    <select
                      value={editEMIForm.type}
                      onChange={(e) => setEditEMIForm({...editEMIForm, type: e.target.value as 'home' | 'car' | 'personal' | 'education' | 'other'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="home">Home Loan</option>
                      <option value="car">Car Loan</option>
                      <option value="personal">Personal Loan</option>
                      <option value="education">Education Loan</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      value={editEMIForm.status}
                      onChange={(e) => setEditEMIForm({...editEMIForm, status: e.target.value as 'active' | 'completed' | 'defaulted'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="defaulted">Defaulted</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Update EMI
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditEMI(false);
                      setEditingEMI(null);
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Loan Modal */}
        {showAddLoan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New Loan</h2>
              <form onSubmit={handleAddLoan}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Loan Name</label>
                    <input
                      type="text"
                      required
                      value={loanForm.name}
                      onChange={(e) => setLoanForm({...loanForm, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="e.g., Business Loan"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Lender Name</label>
                    <input
                      type="text"
                      required
                      value={loanForm.lenderName}
                      onChange={(e) => setLoanForm({...loanForm, lenderName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Bank or lender name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bank Icon</label>
                    <div className="space-y-3">
                      {/* Icon Selection Grid */}
                      <div className="grid grid-cols-6 gap-2">
                        {[
                          { emoji: '🏦', name: 'Bank' },
                          { emoji: '🏧', name: 'ATM' },
                          { emoji: '💳', name: 'Card' },
                          { emoji: '💰', name: 'Money' },
                          { emoji: '📊', name: 'Chart' },
                          { emoji: '🏠', name: 'Home' },
                          { emoji: '🚗', name: 'Car' },
                          { emoji: '🎓', name: 'Education' },
                          { emoji: '💎', name: 'Gold' },
                          { emoji: '⭐', name: 'Star' },
                          { emoji: '🔵', name: 'Blue' },
                          { emoji: '🔴', name: 'Red' }
                        ].map((icon) => (
                          <button
                            key={icon.emoji}
                            type="button"
                            onClick={() => setLoanForm({...loanForm, icon: icon.emoji})}
                            className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-lg hover:bg-gray-50 transition-colors ${
                              loanForm.icon === icon.emoji ? 'border-red-500 bg-red-50' : 'border-gray-200'
                            }`}
                            title={icon.name}
                          >
                            {icon.emoji}
                          </button>
                        ))}
                      </div>
                      
                      {/* Custom Icon URL Input */}
                      <div className="pt-2 border-t border-gray-200">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Or use custom icon URL:</label>
                        <input
                          type="url"
                          value={loanForm.icon.startsWith('http') ? loanForm.icon : ''}
                          onChange={(e) => setLoanForm({...loanForm, icon: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                          placeholder="https://example.com/logo.png"
                        />
                      </div>
                      
                      {/* Preview */}
                      {loanForm.icon && (
                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                          <span className="text-sm text-gray-600">Preview:</span>
                          <div className="w-8 h-8 rounded flex items-center justify-center border border-gray-200">
                            {loanForm.icon.startsWith('http') ? (
                              <img src={loanForm.icon} alt="Icon preview" className="w-full h-full object-contain rounded" />
                            ) : (
                              <span className="text-lg">{loanForm.icon}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Principal Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={loanForm.principalAmount}
                      onChange={(e) => setLoanForm({...loanForm, principalAmount: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Original loan amount"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Current Balance</label>
                    <input
                      type="number"
                      step="0.01"
                      value={loanForm.currentBalance}
                      onChange={(e) => setLoanForm({...loanForm, currentBalance: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Outstanding balance"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Interest Rate (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={loanForm.interestRate}
                      onChange={(e) => setLoanForm({...loanForm, interestRate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Annual interest rate"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Loan Type</label>
                    <select
                      value={loanForm.type}
                      onChange={(e) => setLoanForm({...loanForm, type: e.target.value as 'personal' | 'business' | 'home' | 'car' | 'education' | 'gold' | 'credit_card' | 'other'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="personal">Personal Loan</option>
                      <option value="business">Business Loan</option>
                      <option value="home">Home Loan</option>
                      <option value="car">Car Loan</option>
                      <option value="education">Education Loan</option>
                      <option value="gold">Gold Loan</option>
                      <option value="credit_card">Credit Card Loan</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Total Tenure (months)</label>
                      <input
                        type="number"
                        value={loanForm.totalTenure}
                        onChange={(e) => setLoanForm({...loanForm, totalTenure: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Total loan tenure"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Months Paid</label>
                      <input
                        type="number"
                        value={loanForm.paidMonths}
                        onChange={(e) => setLoanForm({...loanForm, paidMonths: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Months paid"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Monthly EMI Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        value={loanForm.monthlyEMI}
                        onChange={(e) => setLoanForm({...loanForm, monthlyEMI: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Monthly payment"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Next Due Date</label>
                      <input
                        type="date"
                        value={loanForm.nextDueDate}
                        onChange={(e) => setLoanForm({...loanForm, nextDueDate: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Last Paid Date</label>
                      <input
                        type="date"
                        value={loanForm.lastPaidDate}
                        onChange={(e) => setLoanForm({...loanForm, lastPaidDate: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Missed EMIs</label>
                      <input
                        type="number"
                        value={loanForm.missedEMIs}
                        onChange={(e) => setLoanForm({...loanForm, missedEMIs: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={loanForm.startDate}
                        onChange={(e) => setLoanForm({...loanForm, startDate: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                      <input
                        type="date"
                        value={loanForm.dueDate}
                        onChange={(e) => setLoanForm({...loanForm, dueDate: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Add Loan
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddLoan(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Credit Card Modal */}
        {showAddCreditCard && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New Credit Card</h2>
              <form onSubmit={handleAddCreditCard}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Card Name</label>
                    <input
                      type="text"
                      required
                      value={creditCardForm.cardName}
                      onChange={(e) => setCreditCardForm({...creditCardForm, cardName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="e.g., Platinum Rewards Card"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                    <input
                      type="text"
                      required
                      value={creditCardForm.bankName}
                      onChange={(e) => setCreditCardForm({...creditCardForm, bankName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Issuing bank name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Card Type</label>
                    <select
                      value={creditCardForm.cardType}
                      onChange={(e) => setCreditCardForm({...creditCardForm, cardType: e.target.value as any})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="visa">Visa</option>
                      <option value="mastercard">Mastercard</option>
                      <option value="rupay">RuPay</option>
                      <option value="amex">American Express</option>
                      <option value="diners">Diners Club</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Credit Limit</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={creditCardForm.creditLimit}
                      onChange={(e) => setCreditCardForm({...creditCardForm, creditLimit: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Maximum credit limit"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Current Balance</label>
                    <input
                      type="number"
                      step="0.01"
                      value={creditCardForm.currentBalance}
                      onChange={(e) => setCreditCardForm({...creditCardForm, currentBalance: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Current outstanding balance"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Due</label>
                      <input
                        type="number"
                        step="0.01"
                        value={creditCardForm.minimumDue}
                        onChange={(e) => setCreditCardForm({...creditCardForm, minimumDue: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Minimum amount due"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Total Due</label>
                      <input
                        type="number"
                        step="0.01"
                        value={creditCardForm.totalDue}
                        onChange={(e) => setCreditCardForm({...creditCardForm, totalDue: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Total amount due"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                    <input
                      type="date"
                      value={creditCardForm.dueDate}
                      onChange={(e) => setCreditCardForm({...creditCardForm, dueDate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Interest Rate (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={creditCardForm.interestRate}
                        onChange={(e) => setCreditCardForm({...creditCardForm, interestRate: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Annual interest rate"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Last 4 Digits</label>
                      <input
                        type="text"
                        maxLength={4}
                        value={creditCardForm.lastFourDigits}
                        onChange={(e) => setCreditCardForm({...creditCardForm, lastFourDigits: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="6273"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Add Credit Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddCreditCard(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Credit Card Modal */}
        {showEditCreditCard && editingCreditCard && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Edit Credit Card</h2>
              <form onSubmit={handleUpdateCreditCard}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Card Name</label>
                    <input
                      type="text"
                      required
                      value={editCreditCardForm.cardName}
                      onChange={(e) => setEditCreditCardForm({...editCreditCardForm, cardName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="e.g., Platinum Rewards Card"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                    <input
                      type="text"
                      required
                      value={editCreditCardForm.bankName}
                      onChange={(e) => setEditCreditCardForm({...editCreditCardForm, bankName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Issuing bank name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Card Type</label>
                    <select
                      value={editCreditCardForm.cardType}
                      onChange={(e) => setEditCreditCardForm({...editCreditCardForm, cardType: e.target.value as any})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="visa">Visa</option>
                      <option value="mastercard">Mastercard</option>
                      <option value="rupay">RuPay</option>
                      <option value="amex">American Express</option>
                      <option value="diners">Diners Club</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Credit Limit</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editCreditCardForm.creditLimit}
                      onChange={(e) => setEditCreditCardForm({...editCreditCardForm, creditLimit: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Maximum credit limit"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Current Balance</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editCreditCardForm.currentBalance}
                      onChange={(e) => setEditCreditCardForm({...editCreditCardForm, currentBalance: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Current outstanding balance"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Due</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editCreditCardForm.minimumDue}
                        onChange={(e) => setEditCreditCardForm({...editCreditCardForm, minimumDue: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Minimum amount due"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Total Due</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editCreditCardForm.totalDue}
                        onChange={(e) => setEditCreditCardForm({...editCreditCardForm, totalDue: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Total amount due"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                    <input
                      type="date"
                      value={editCreditCardForm.dueDate}
                      onChange={(e) => setEditCreditCardForm({...editCreditCardForm, dueDate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Interest Rate (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editCreditCardForm.interestRate}
                        onChange={(e) => setEditCreditCardForm({...editCreditCardForm, interestRate: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Annual interest rate"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Last 4 Digits</label>
                      <input
                        type="text"
                        maxLength={4}
                        value={editCreditCardForm.lastFourDigits}
                        onChange={(e) => setEditCreditCardForm({...editCreditCardForm, lastFourDigits: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="6273"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      value={editCreditCardForm.status}
                      onChange={(e) => setEditCreditCardForm({...editCreditCardForm, status: e.target.value as any})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="active">Active</option>
                      <option value="blocked">Blocked</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Update Credit Card
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditCreditCard(false);
                      setEditingCreditCard(null);
                      setEditCreditCardForm({
                        cardName: '',
                        bankName: '',
                        cardType: 'visa',
                        creditLimit: '',
                        currentBalance: '',
                        availableCredit: '',
                        minimumDue: '',
                        totalDue: '',
                        dueDate: '',
                        interestRate: '',
                        lastFourDigits: '',
                        status: 'active'
                      });
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Loan Modal */}
        {showEditLoan && editingLoan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-semibold mb-4">Edit Loan</h3>
              <form onSubmit={handleUpdateLoan}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Loan Name</label>
                    <input
                      type="text"
                      required
                      value={editLoanForm.name}
                      onChange={(e) => setEditLoanForm({...editLoanForm, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="e.g., Business Loan"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Lender Name</label>
                    <input
                      type="text"
                      required
                      value={editLoanForm.lenderName}
                      onChange={(e) => setEditLoanForm({...editLoanForm, lenderName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Bank or lender name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bank Icon</label>
                    <div className="space-y-3">
                      {/* Icon Selection Grid */}
                      <div className="grid grid-cols-6 gap-2">
                        {[
                          { emoji: '🏦', name: 'Bank' },
                          { emoji: '🏧', name: 'ATM' },
                          { emoji: '💳', name: 'Card' },
                          { emoji: '💰', name: 'Money' },
                          { emoji: '📊', name: 'Chart' },
                          { emoji: '🏠', name: 'Home' },
                          { emoji: '🚗', name: 'Car' },
                          { emoji: '🎓', name: 'Education' },
                          { emoji: '💎', name: 'Gold' },
                          { emoji: '⭐', name: 'Star' },
                          { emoji: '🔵', name: 'Blue' },
                          { emoji: '🔴', name: 'Red' }
                        ].map((icon) => (
                          <button
                            key={icon.emoji}
                            type="button"
                            onClick={() => setEditLoanForm({...editLoanForm, icon: icon.emoji})}
                            className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-lg hover:bg-gray-50 transition-colors ${
                              editLoanForm.icon === icon.emoji ? 'border-red-500 bg-red-50' : 'border-gray-200'
                            }`}
                            title={icon.name}
                          >
                            {icon.emoji}
                          </button>
                        ))}
                      </div>
                      
                      {/* Custom Icon URL Input */}
                      <div className="pt-2 border-t border-gray-200">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Or use custom icon URL:</label>
                        <input
                          type="url"
                          value={editLoanForm.icon && editLoanForm.icon.startsWith('http') ? editLoanForm.icon : ''}
                          onChange={(e) => setEditLoanForm({...editLoanForm, icon: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                          placeholder="https://example.com/logo.png"
                        />
                      </div>
                      
                      {/* Preview */}
                      {editLoanForm.icon && (
                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                          <span className="text-sm text-gray-600">Preview:</span>
                          <div className="w-8 h-8 rounded flex items-center justify-center border border-gray-200">
                            {editLoanForm.icon.startsWith('http') ? (
                              <img src={editLoanForm.icon} alt="Icon preview" className="w-full h-full object-contain rounded" />
                            ) : (
                              <span className="text-lg">{editLoanForm.icon}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Principal Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editLoanForm.principalAmount}
                      onChange={(e) => setEditLoanForm({...editLoanForm, principalAmount: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Original loan amount"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Current Balance</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editLoanForm.currentBalance}
                      onChange={(e) => setEditLoanForm({...editLoanForm, currentBalance: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Outstanding balance"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Interest Rate (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editLoanForm.interestRate}
                      onChange={(e) => setEditLoanForm({...editLoanForm, interestRate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Annual interest rate"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Loan Type</label>
                    <select
                      value={editLoanForm.type}
                      onChange={(e) => setEditLoanForm({...editLoanForm, type: e.target.value as 'personal' | 'business' | 'home' | 'car' | 'education' | 'gold' | 'credit_card' | 'other'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="personal">Personal Loan</option>
                      <option value="business">Business Loan</option>
                      <option value="home">Home Loan</option>
                      <option value="car">Car Loan</option>
                      <option value="education">Education Loan</option>
                      <option value="gold">Gold Loan</option>
                      <option value="credit_card">Credit Card Loan</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Total Tenure (months)</label>
                      <input
                        type="number"
                        value={editLoanForm.totalTenure}
                        onChange={(e) => setEditLoanForm({...editLoanForm, totalTenure: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Total loan tenure"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Months Paid</label>
                      <input
                        type="number"
                        value={editLoanForm.paidMonths}
                        onChange={(e) => setEditLoanForm({...editLoanForm, paidMonths: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Months paid"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Monthly EMI Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editLoanForm.monthlyEMI}
                        onChange={(e) => setEditLoanForm({...editLoanForm, monthlyEMI: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Monthly payment"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Next Due Date</label>
                      <input
                        type="date"
                        value={editLoanForm.nextDueDate}
                        onChange={(e) => setEditLoanForm({...editLoanForm, nextDueDate: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Last Paid Date</label>
                      <input
                        type="date"
                        value={editLoanForm.lastPaidDate}
                        onChange={(e) => setEditLoanForm({...editLoanForm, lastPaidDate: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Missed EMIs</label>
                      <input
                        type="number"
                        value={editLoanForm.missedEMIs}
                        onChange={(e) => setEditLoanForm({...editLoanForm, missedEMIs: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={editLoanForm.startDate}
                        onChange={(e) => setEditLoanForm({...editLoanForm, startDate: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                      <input
                        type="date"
                        value={editLoanForm.dueDate}
                        onChange={(e) => setEditLoanForm({...editLoanForm, dueDate: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      value={editLoanForm.status}
                      onChange={(e) => setEditLoanForm({...editLoanForm, status: e.target.value as 'active' | 'closed' | 'overdue'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="active">Active</option>
                      <option value="closed">Closed</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Update Loan
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditLoan(false);
                      setEditingLoan(null);
                      setEditLoanForm({
                        type: 'personal',
                        bankName: '',
                        principalAmount: '',
                        interestRate: '',
                        tenureMonths: '',
                        emiAmount: '',
                        outstandingAmount: '',
                        paymentsCompleted: '',
                        startDate: '',
                        nextEMIDate: '',
                        status: 'active'
                      });
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Subscription Modal */}
        {showAddSubscription && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New Subscription</h2>
              <form onSubmit={handleAddSubscription}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subscription Name*</label>
                    <input
                      type="text"
                      required
                      value={subscriptionForm.name}
                      onChange={(e) => setSubscriptionForm({...subscriptionForm, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Netflix, Spotify, etc."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
                    <input
                      type="text"
                      value={subscriptionForm.provider}
                      onChange={(e) => setSubscriptionForm({...subscriptionForm, provider: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Netflix, Inc."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={subscriptionForm.description}
                      onChange={(e) => setSubscriptionForm({...subscriptionForm, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Premium plan with 4K streaming"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Amount*</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={subscriptionForm.amount}
                        onChange={(e) => setSubscriptionForm({...subscriptionForm, amount: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="199.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                      <select
                        value={subscriptionForm.currency}
                        onChange={(e) => setSubscriptionForm({...subscriptionForm, currency: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <option value="INR">₹ INR</option>
                        <option value="USD">$ USD</option>
                        <option value="EUR">€ EUR</option>
                        <option value="GBP">£ GBP</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Billing Cycle</label>
                      <select
                        value={subscriptionForm.billingCycle}
                        onChange={(e) => setSubscriptionForm({...subscriptionForm, billingCycle: e.target.value as 'monthly' | 'quarterly' | 'annually' | 'custom'})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="annually">Annually</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                    {subscriptionForm.billingCycle === 'custom' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Custom Days</label>
                        <input
                          type="number"
                          value={subscriptionForm.customCycleDays}
                          onChange={(e) => setSubscriptionForm({...subscriptionForm, customCycleDays: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                          placeholder="30"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Next Billing Date*</label>
                    <input
                      type="date"
                      required
                      value={subscriptionForm.nextBillingDate}
                      onChange={(e) => setSubscriptionForm({...subscriptionForm, nextBillingDate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      value={subscriptionForm.category}
                      onChange={(e) => setSubscriptionForm({...subscriptionForm, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="entertainment">Entertainment</option>
                      <option value="streaming">Streaming</option>
                      <option value="music">Music</option>
                      <option value="gaming">Gaming</option>
                      <option value="software">Software</option>
                      <option value="cloud">Cloud Storage</option>
                      <option value="news">News</option>
                      <option value="fitness">Fitness</option>
                      <option value="education">Education</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Auto Renewal</label>
                      <select
                        value={subscriptionForm.autoRenewal ? 'Yes' : 'No'}
                        onChange={(e) => setSubscriptionForm({...subscriptionForm, autoRenewal: e.target.value === 'Yes'})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Reminder Days</label>
                      <input
                        type="number"
                        value={subscriptionForm.reminderDays}
                        onChange={(e) => setSubscriptionForm({...subscriptionForm, reminderDays: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="7"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      value={subscriptionForm.status}
                      onChange={(e) => setSubscriptionForm({...subscriptionForm, status: e.target.value as 'active' | 'cancelled' | 'paused'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                    <textarea
                      value={subscriptionForm.notes}
                      onChange={(e) => setSubscriptionForm({...subscriptionForm, notes: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Additional notes"
                      rows={2}
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Add Subscription
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddSubscription(false);
                      setSubscriptionForm({
                        name: '',
                        provider: '',
                        description: '',
                        amount: '',
                        currency: 'INR',
                        billingCycle: 'monthly',
                        customCycleDays: '',
                        nextBillingDate: new Date().toISOString().split('T')[0],
                        category: 'entertainment',
                        icon: '',
                        autoRenewal: true,
                        reminderDays: '7',
                        status: 'active',
                        notes: ''
                      });
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Subscription Modal */}
        {showEditSubscription && editingSubscription && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Edit Subscription</h2>
              <form onSubmit={handleUpdateSubscription}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subscription Name*</label>
                    <input
                      type="text"
                      required
                      value={editingSubscription.name}
                      onChange={(e) => setEditingSubscription({...editingSubscription, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Netflix, Spotify, etc."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
                    <input
                      type="text"
                      value={editingSubscription.provider}
                      onChange={(e) => setEditingSubscription({...editingSubscription, provider: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Netflix, Inc."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Amount*</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={editingSubscription.amount}
                        onChange={(e) => setEditingSubscription({...editingSubscription, amount: parseFloat(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="199.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                      <select
                        value={editingSubscription.currency}
                        onChange={(e) => setEditingSubscription({...editingSubscription, currency: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <option value="INR">₹ INR</option>
                        <option value="USD">$ USD</option>
                        <option value="EUR">€ EUR</option>
                        <option value="GBP">£ GBP</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Next Billing Date*</label>
                    <input
                      type="date"
                      required
                      value={editingSubscription.nextBillingDate}
                      onChange={(e) => setEditingSubscription({...editingSubscription, nextBillingDate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      value={editingSubscription.status}
                      onChange={(e) => setEditingSubscription({...editingSubscription, status: e.target.value as 'active' | 'cancelled' | 'paused'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Update Subscription
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditSubscription(false);
                      setEditingSubscription(null);
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
