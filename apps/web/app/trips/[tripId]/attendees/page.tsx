'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Spinner, Input, Modal, ModalContent, ModalHeader, ModalBody } from '@/components/ui';
import { PageHeader } from '@/components/navigation';
import { AttendeeCard } from '@/components/domain';

interface PaymentHandles {
  venmo?: string;
  paypal?: string;
  cashapp?: string;
  zelle?: string;
}

interface Attendee {
  id: string;
  name: string;
  email?: string;
  role: 'organizer' | 'attendee';
  avatarUrl?: string;
  paymentHandles?: PaymentHandles;
  status: 'active' | 'revoked';
  joinedAt: string;
}

interface Balance {
  attendeeId: string;
  balance: number;
}

interface BalanceData {
  balances: Balance[];
}

interface AttendeesData {
  attendees: Attendee[];
}

interface CurrentUser {
  id: string;
  role: 'organizer' | 'attendee';
}

export default function AttendeesPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;

  const [attendees, setAttendees] = useState<AttendeesData | null>(null);
  const [balances, setBalances] = useState<BalanceData | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  // Invite Modal
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const [attendeesRes, balancesRes, meRes] = await Promise.all([
          fetch(`/api/trips/${tripId}/attendees`),
          fetch(`/api/trips/${tripId}/expenses/balances`),
          fetch(`/api/trips/${tripId}/me`),
        ]);

        if (!attendeesRes.ok) {
          throw new Error('Failed to load attendees');
        }

        const attendeesData = await attendeesRes.json();
        setAttendees(attendeesData.data);

        if (balancesRes.ok) {
          const balancesData = await balancesRes.json();
          setBalances(balancesData.data);
        }

        if (meRes.ok) {
          const meData = await meRes.json();
          setCurrentUser(meData.data);
        }
      } catch (err) {
        setError('Failed to load attendees data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [tripId]);

  const balanceMap = useMemo(() => {
    return new Map(balances?.balances.map((b) => [b.attendeeId, b.balance]) || []);
  }, [balances]);

  const filteredAttendees = useMemo(() => {
    if (!attendees?.attendees) return [];

    return attendees.attendees.filter((attendee) => {
      return attendee.name.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [attendees, searchTerm]);

  const isOrganizer = currentUser?.role === 'organizer';

  if (loading) {
    return (
      <div className="attendees-loading" data-testid="attendees-loading">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="attendees-error" data-testid="attendees-error">
        <p>{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="attendees-page" data-testid="attendees-page">
      <PageHeader
        title="Attendees"
        subtitle={`${attendees?.attendees.length || 0} attendees`}
        actions={
          isOrganizer && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowInviteModal(true)}
            >
              Invite
            </Button>
          )
        }
      />

      <div className="attendees-content">
        {/* Search */}
        <div className="attendees-search">
          <Input
            placeholder="Search attendees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Attendee List */}
        <div className="attendees-list">
          {filteredAttendees.map((attendee) => (
            <AttendeeCard
              key={attendee.id}
              id={attendee.id}
              name={attendee.name}
              role={attendee.role}
              avatarUrl={attendee.avatarUrl}
              balance={balanceMap.get(attendee.id)}
              paymentHandles={attendee.paymentHandles}
              onClick={() => router.push(`/trips/${tripId}/attendees/${attendee.id}`)}
            />
          ))}
        </div>
      </div>

      {/* Invite Modal */}
      <Modal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)}>
        <ModalContent data-testid="invite-modal">
          <ModalHeader>Invite Attendee</ModalHeader>
          <ModalBody>
            <div className="invite-form">
              <Input
                label="Email"
                id="invite-email"
                type="email"
                placeholder="Enter email address"
              />
              <Button variant="primary" fullWidth>
                Send Invite
              </Button>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  );
}
