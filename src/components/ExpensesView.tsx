import React from 'react';
import { ExpenseAccountsManagementView } from './ExpenseAccountsManagementView';
import { Expense, ExpenseAllocationMethod, Restaurant, UserRole } from '../types';

interface ExpensesViewProps {
  expenses?: Expense[];
  restaurants?: Restaurant[];
  currentRole?: UserRole;
  onCreateExpense?: (expense: any) => Promise<void>;
  onAllocateExpense?: (expenseId: string, method: ExpenseAllocationMethod, targetIds?: string[]) => Promise<void>;
  onDeleteExpense?: (expenseId: string) => Promise<void>;
  preselectedExpenseId?: string;
  onRefreshData?: () => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  onRefreshData,
}) => {
  return (
    <ExpenseAccountsManagementView
      onDataMutated={onRefreshData}
      isStandalone={true}
    />
  );
};
