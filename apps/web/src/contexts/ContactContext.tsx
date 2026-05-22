import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiGet } from '@/lib/api';

interface ContactInfo {
  contact_email: string;
  contact_phone: string;
  contact_hours: string;
}

const ContactContext = createContext<ContactInfo | null>(null);

export function ContactProvider({ children }: { children: ReactNode }) {
  const [contact, setContact] = useState<ContactInfo | null>(null);

  useEffect(() => {
    apiGet<ContactInfo>('/api/config')
      .then(setContact)
      .catch(() => null);
  }, []);

  return <ContactContext.Provider value={contact}>{children}</ContactContext.Provider>;
}

export function useContact(): ContactInfo | null {
  return useContext(ContactContext);
}
