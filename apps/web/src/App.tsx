import { Routes, Route } from 'react-router-dom';
import { ContactProvider } from '@/contexts/ContactContext';
import { Layout } from '@/components/Layout';
import { Home } from '@/pages/Home';
import { ConfirmForm } from '@/pages/ConfirmForm';
import { Success } from '@/pages/Success';
import { AlreadyConfirmed } from '@/pages/AlreadyConfirmed';
import { EventFull } from '@/pages/EventFull';
import { InvalidToken } from '@/pages/InvalidToken';

function App() {
  return (
    <ContactProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/confirm" element={<ConfirmForm />} />
          <Route path="/confirm/success" element={<Success />} />
          <Route path="/confirm/already" element={<AlreadyConfirmed />} />
          <Route path="/confirm/full" element={<EventFull />} />
          <Route path="/confirm/invalid" element={<InvalidToken />} />
          <Route path="*" element={<InvalidToken />} />
        </Route>
      </Routes>
    </ContactProvider>
  );
}

export default App;
