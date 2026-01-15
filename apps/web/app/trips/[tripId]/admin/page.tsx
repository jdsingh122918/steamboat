'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Spinner, Card, CardHeader, CardTitle, CardContent, Select } from '@/components/ui';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { PageHeader } from '@/components/navigation';
import { formatCurrency } from '@/lib/utils/format';

interface TripStats {
  totalExpenses: number;
  expenseCount: number;
  totalAttendees: number;
  confirmedAttendees: number;
  totalPhotos: number;
  totalActivities: number;
  completedActivities: number;
  totalPolls: number;
  openPolls: number;
  closedPolls: number;
  expenseBreakdown: Array<{ category: string; total: number; count: number }>;
  settlementStatus: { pending: number; completed: number; total: number };
}

interface DeletedItem {
  id: string;
  type: 'expense' | 'media' | 'activity';
  title: string;
  deletedAt: string;
  deletedBy: { id: string; name: string };
  autoDeleteAt: string;
  metadata?: {
    amount_cents?: number;
    thumbnailUrl?: string;
    scheduledAt?: string;
  };
}

interface Attendee {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
}

const DELETED_TYPE_FILTER_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'expense', label: 'Expenses' },
  { value: 'media', label: 'Media' },
  { value: 'activity', label: 'Activities' },
];

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function AdminPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;

  const [stats, setStats] = useState<TripStats | null>(null);
  const [deletedItems, setDeletedItems] = useState<DeletedItem[]>([]);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('statistics');

  // Filters
  const [deletedTypeFilter, setDeletedTypeFilter] = useState('');

  // Modal states
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [selectedNewAdmin, setSelectedNewAdmin] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const [statsRes, deletedRes, attendeesRes] = await Promise.all([
          fetch(`/api/trips/${tripId}/stats`),
          fetch(`/api/trips/${tripId}/deleted`),
          fetch(`/api/trips/${tripId}/attendees`),
        ]);

        // Check for authorization error
        if (statsRes.status === 403) {
          router.replace(`/trips/${tripId}`);
          return;
        }

        if (!statsRes.ok) {
          throw new Error('Failed to load admin data');
        }

        const statsData = await statsRes.json();
        setStats(statsData.data);

        if (deletedRes.ok) {
          const deletedData = await deletedRes.json();
          setDeletedItems(deletedData.data?.items || []);
        }

        if (attendeesRes.ok) {
          const attendeesData = await attendeesRes.json();
          setAttendees(attendeesData.data || []);
        }
      } catch (err) {
        setError('Failed to load admin dashboard');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [tripId, router]);

  const filteredDeletedItems = useMemo(() => {
    if (!deletedTypeFilter) return deletedItems;
    return deletedItems.filter((item) => item.type === deletedTypeFilter);
  }, [deletedItems, deletedTypeFilter]);

  const nonAdminAttendees = useMemo(() => {
    return attendees.filter((a) => a.role !== 'admin');
  }, [attendees]);

  const handleRestore = useCallback(
    async (itemId: string) => {
      try {
        const response = await fetch(
          `/api/trips/${tripId}/deleted/${itemId}/restore`,
          { method: 'POST' }
        );

        if (response.ok) {
          // Refresh deleted items
          const deletedRes = await fetch(`/api/trips/${tripId}/deleted`);
          if (deletedRes.ok) {
            const deletedData = await deletedRes.json();
            setDeletedItems(deletedData.data?.items || []);
          }
        }
      } catch (err) {
        console.error('Restore failed:', err);
      }
    },
    [tripId]
  );

  const handlePermanentDelete = useCallback(
    async (itemId: string) => {
      try {
        const response = await fetch(`/api/trips/${tripId}/deleted/${itemId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setDeletedItems((prev) => prev.filter((item) => item.id !== itemId));
          setShowDeleteConfirm(null);
        }
      } catch (err) {
        console.error('Delete failed:', err);
      }
    },
    [tripId]
  );

  const handleAdminTransfer = useCallback(async () => {
    if (!selectedNewAdmin) return;

    setIsTransferring(true);

    try {
      const response = await fetch(`/api/trips/${tripId}/admin/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newAdminId: selectedNewAdmin }),
      });

      if (response.ok) {
        // Redirect to trip dashboard since we're no longer admin
        router.replace(`/trips/${tripId}`);
      }
    } catch (err) {
      console.error('Transfer failed:', err);
    } finally {
      setIsTransferring(false);
    }
  }, [tripId, selectedNewAdmin, router]);

  if (loading) {
    return (
      <div className="admin-loading" data-testid="admin-loading">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-error" data-testid="admin-error">
        <p>{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="admin-page" data-testid="admin-page">
      <PageHeader title="Admin Dashboard" subtitle="Manage your trip" />

      <div className="admin-content">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
            <TabsTrigger value="deleted">Deleted Items</TabsTrigger>
            <TabsTrigger value="transfer">Admin Transfer</TabsTrigger>
          </TabsList>

          {/* Statistics Tab */}
          <TabsContent value="statistics">
            <div className="admin-statistics" data-testid="statistics-section">
              <Card data-testid="stats-card">
                <CardHeader>
                  <CardTitle>Trip Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats && (
                    <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                      <div className="stat-item">
                        <div className="stat-label">Total Expenses</div>
                        <div className="stat-value">{formatCurrency(stats.totalExpenses / 100)}</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-label">Expense Count</div>
                        <div className="stat-value">{stats.expenseCount}</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-label">Total Attendees</div>
                        <div className="stat-value">{stats.totalAttendees}</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-label">Confirmed</div>
                        <div className="stat-value">{stats.confirmedAttendees}</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-label">Photos</div>
                        <div className="stat-value">{stats.totalPhotos}</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-label">Activities</div>
                        <div className="stat-value">{stats.completedActivities}/{stats.totalActivities}</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-label">Polls</div>
                        <div className="stat-value">{stats.closedPolls}/{stats.totalPolls}</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-label">Settlements</div>
                        <div className="stat-value">{stats.settlementStatus.completed}/{stats.settlementStatus.total}</div>
                      </div>
                    </div>
                  )}

                  {stats?.expenseBreakdown && stats.expenseBreakdown.length > 0 && (
                    <div className="expense-breakdown" style={{ marginTop: 24 }}>
                      <h4>Expense Breakdown</h4>
                      <div className="breakdown-list">
                        {stats.expenseBreakdown.map((item) => (
                          <div key={item.category} className="breakdown-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                            <span style={{ textTransform: 'capitalize' }}>{item.category}</span>
                            <span>{formatCurrency(item.total / 100)} ({item.count})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Deleted Items Tab */}
          <TabsContent value="deleted">
            <div className="admin-deleted" data-testid="deleted-items-section">
              <div className="deleted-filters" style={{ marginBottom: 16 }}>
                <Select
                  label="Filter by Type"
                  id="deleted-type-filter"
                  value={deletedTypeFilter}
                  onChange={(e) => setDeletedTypeFilter(e.target.value)}
                  options={DELETED_TYPE_FILTER_OPTIONS}
                />
              </div>

              <div className="deleted-list">
                {filteredDeletedItems.length > 0 ? (
                  filteredDeletedItems.map((item) => (
                    <Card key={item.id} style={{ marginBottom: 12 }}>
                      <CardContent style={{ padding: 16 }}>
                        <div className="deleted-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 500 }}>{item.title}</div>
                            <div style={{ fontSize: 12, color: '#666' }}>
                              <span style={{ textTransform: 'capitalize' }}>{item.type}</span>
                              {' | '}
                              Deleted by {item.deletedBy.name} on {formatDate(item.deletedAt)}
                            </div>
                            <div style={{ fontSize: 11, color: '#999' }}>
                              Auto-deletes on {formatDate(item.autoDeleteAt)}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRestore(item.id)}
                            >
                              Restore
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setShowDeleteConfirm(item.id)}
                            >
                              Delete Permanently
                            </Button>
                          </div>
                        </div>

                        {/* Delete confirmation */}
                        {showDeleteConfirm === item.id && (
                          <div style={{ marginTop: 12, padding: 12, backgroundColor: '#fef2f2', borderRadius: 4 }}>
                            <p style={{ color: '#dc2626', marginBottom: 8 }}>
                              Are you sure you want to permanently delete this item? This action cannot be undone.
                            </p>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setShowDeleteConfirm(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handlePermanentDelete(item.id)}
                                style={{ backgroundColor: '#dc2626' }}
                              >
                                Confirm Delete
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p style={{ textAlign: 'center', color: '#666' }}>No deleted items found</p>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Admin Transfer Tab */}
          <TabsContent value="transfer">
            <div className="admin-transfer" data-testid="admin-transfer-section">
              <Card>
                <CardHeader>
                  <CardTitle>Transfer Admin Role</CardTitle>
                </CardHeader>
                <CardContent>
                  <p style={{ marginBottom: 16, color: '#666' }}>
                    Transfer your admin privileges to another trip member. You will lose admin access after the transfer.
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => setShowTransferModal(true)}
                  >
                    Transfer Admin Role
                  </Button>
                </CardContent>
              </Card>

              {/* Transfer Modal */}
              {showTransferModal && (
                <div
                  data-testid="admin-transfer-modal"
                  style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                  }}
                >
                  <div
                    style={{
                      backgroundColor: 'white',
                      padding: 24,
                      borderRadius: 8,
                      maxWidth: 400,
                      width: '100%',
                    }}
                  >
                    <h3 style={{ marginBottom: 16 }}>Transfer Admin Role</h3>
                    <p style={{ marginBottom: 16, color: '#666', fontSize: 14 }}>
                      Select a member to become the new admin:
                    </p>

                    <div className="attendee-list" style={{ marginBottom: 16 }}>
                      {nonAdminAttendees.map((attendee) => (
                        <label
                          key={attendee._id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: 12,
                            border: '1px solid #eee',
                            borderRadius: 4,
                            marginBottom: 8,
                            cursor: 'pointer',
                            backgroundColor: selectedNewAdmin === attendee._id ? '#f0f9ff' : 'white',
                          }}
                        >
                          <input
                            type="radio"
                            name="newAdmin"
                            value={attendee._id}
                            checked={selectedNewAdmin === attendee._id}
                            onChange={(e) => setSelectedNewAdmin(e.target.value)}
                            style={{ marginRight: 12 }}
                          />
                          <div>
                            <div style={{ fontWeight: 500 }}>{attendee.name}</div>
                            <div style={{ fontSize: 12, color: '#666' }}>{attendee.email}</div>
                          </div>
                        </label>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setShowTransferModal(false);
                          setSelectedNewAdmin('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        onClick={handleAdminTransfer}
                        disabled={!selectedNewAdmin || isTransferring}
                      >
                        {isTransferring ? 'Transferring...' : 'Confirm Transfer'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
