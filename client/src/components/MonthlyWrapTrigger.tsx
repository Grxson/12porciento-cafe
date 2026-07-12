import { useState } from 'react';
import { useUser } from '../context/UserContext';
import MonthlyWrap from './MonthlyWrap';

const STORAGE_KEY = 'monthly-wrap-month';

function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

export default function MonthlyWrapTrigger() {
  const user = useUser((s) => s.user);
  const [open, setOpen] = useState(() => {
    if (!user?.id) return false;
    return localStorage.getItem(STORAGE_KEY) !== currentMonthKey();
  });

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, currentMonthKey());
    setOpen(false);
  };

  if (!open || !user?.id) return null;

  return <MonthlyWrap userId={user.id} onClose={handleClose} />;
}
