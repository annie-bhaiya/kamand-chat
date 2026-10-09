import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isUserHostelRoom, isUserMessRoom, isUserBranchRoom } from '../src/lib/residence';
import { ResidenceOnboardingModal } from '../src/components/campus/ResidenceOnboardingModal';
import { ToastProvider } from '../src/components/ui/Toast';

const authHarness = vi.hoisted(() => ({
  profile: {
    id: 'usr-1',
    username: 'b23419',
    display_name: 'Utkarsh',
    hostel: null as string | null,
    hostel_block: null as string | null,
    branch: null as string | null,
    mess: null as string | null,
    chat_only: false,
  },
  updateProfile: vi.fn(),
}));

vi.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    profile: authHarness.profile,
    updateProfile: authHarness.updateProfile,
    user: { id: 'usr-1' },
    isAuthenticated: true,
  }),
  useOptionalAuth: () => ({
    profile: authHarness.profile,
    updateProfile: authHarness.updateProfile,
    user: { id: 'usr-1' },
    isAuthenticated: true,
  }),
}));

describe('Residence & Branch Helper Functions', () => {
  it('correctly matches assigned hostel rooms and restricts other hostels or blocks', () => {
    const suvalsarGenRoom = { category: 'hostels', hostelCluster: 'Suvalsar', name: 'Suvalsar Cluster - General', slug: 'suvalsar-general' };
    const suvalsarB11Room = { category: 'hostels', hostelCluster: 'Suvalsar', hostelBlock: 'B11', name: 'Suvalsar Block B11', slug: 'b11-chat' };
    const suvalsarB12Room = { category: 'hostels', hostelCluster: 'Suvalsar', hostelBlock: 'B12', name: 'Suvalsar Block B12', slug: 'b12-chat' };
    const parasharRoom = { category: 'hostels', hostelCluster: 'Parashar', name: 'Parashar Hostel', slug: 'hostels-parashar' };
    const clubRoom = { category: 'clubs', name: 'KamandPrompt', slug: 'clubs-kamandprompt' };

    // Assigned to Suvalsar Block B11
    expect(isUserHostelRoom(suvalsarGenRoom, 'Suvalsar', 'B11')).toBe(true);
    expect(isUserHostelRoom(suvalsarB11Room, 'Suvalsar', 'B11')).toBe(true);
    expect(isUserHostelRoom(suvalsarB12Room, 'Suvalsar', 'B11')).toBe(false);
    expect(isUserHostelRoom(parasharRoom, 'Suvalsar', 'B11')).toBe(false);

    // Non-hostel categories are open
    expect(isUserHostelRoom(clubRoom, 'Suvalsar', 'B11')).toBe(true);

    // When user has no hostel assigned
    expect(isUserHostelRoom(suvalsarGenRoom, null, null)).toBe(false);
  });

  it('correctly matches assigned branch room and restricts other branches', () => {
    const cseRoom = { category: 'branches', id: 'branch-cse', slug: 'btech-cse', name: 'B.Tech - Computer Science & Engineering' };
    const dsaiRoom = { category: 'branches', id: 'branch-dsai', slug: 'btech-dsai', name: 'B.Tech - Data Science & Artificial Intelligence' };
    const clubRoom = { category: 'clubs', id: 'club-robotronics', slug: 'robotronics', name: 'Robotronics' };

    // Assigned to CSE
    expect(isUserBranchRoom(cseRoom, 'btech-cse')).toBe(true);
    expect(isUserBranchRoom(dsaiRoom, 'btech-cse')).toBe(false);

    // Matching by full name
    expect(isUserBranchRoom(cseRoom, 'B.Tech - Computer Science & Engineering')).toBe(true);

    // Non-branch categories are open
    expect(isUserBranchRoom(clubRoom, 'btech-cse')).toBe(true);

    // When user has no branch assigned
    expect(isUserBranchRoom(cseRoom, null)).toBe(false);
  });

  it('correctly matches assigned mess rooms and restricts other dining halls', () => {
    const pineMessRoom = { category: 'messes', name: 'Pine Mess (North Dining 1)', slug: 'pine-mess' };
    const oakMessRoom = { category: 'messes', name: 'Oak Mess (North Dining 2)', slug: 'oak-mess' };
    const clubRoom = { category: 'clubs', name: 'Robotronics', slug: 'robotronics' };

    // Assigned to Pine Mess
    expect(isUserMessRoom(pineMessRoom, 'Pine Mess (North Dining 1)')).toBe(true);
    expect(isUserMessRoom(oakMessRoom, 'Pine Mess (North Dining 1)')).toBe(false);

    // Non-mess categories are open
    expect(isUserMessRoom(clubRoom, 'Pine Mess (North Dining 1)')).toBe(true);

    // When user has no mess assigned
    expect(isUserMessRoom(pineMessRoom, null)).toBe(false);
  });
});

describe('ResidenceOnboardingModal', () => {
  beforeEach(() => {
    authHarness.profile = {
      id: 'usr-1',
      username: 'b23419',
      display_name: 'Utkarsh',
      hostel: null,
      hostel_block: null,
      branch: null,
      mess: null,
      chat_only: false,
    };
    authHarness.updateProfile.mockReset();
    authHarness.updateProfile.mockResolvedValue({});
  });

  it('submits selected branch, hostel, dynamic block, and mess and marks chat_only as false', async () => {
    render(
      <ToastProvider>
        <ResidenceOnboardingModal isOpen={true} />
      </ToastProvider>
    );

    // Select Branch
    const branchSelect = screen.getByLabelText(/Academic Branch/i);
    fireEvent.change(branchSelect, { target: { value: 'btech-cse' } });

    // Select Hostel
    const hostelSelect = screen.getByLabelText(/Hostel Cluster/i);
    fireEvent.change(hostelSelect, { target: { value: 'Suvalsar' } });

    // Select Block (should now populate with B11-B14)
    const blockSelect = screen.getByLabelText(/Hostel Block/i);
    fireEvent.change(blockSelect, { target: { value: 'B11' } });

    // Select Mess
    const messSelect = screen.getByLabelText(/Dining Mess/i);
    fireEvent.change(messSelect, { target: { value: 'Alder Mess' } });

    // Click Save
    const submitBtn = screen.getByRole('button', { name: /Save & Continue to Dashboard/i }) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(false);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(authHarness.updateProfile).toHaveBeenCalledWith({
        branch: 'btech-cse',
        hostel: 'Suvalsar',
        hostel_block: 'B11',
        mess: 'Alder Mess',
        chat_only: false,
      });
    });
  });

  it('stores chat_only: true and clears restricted affiliations when continuing only for chat', async () => {
    render(
      <ToastProvider>
        <ResidenceOnboardingModal isOpen={true} />
      </ToastProvider>
    );

    const chatOnlyBtn = screen.getByRole('button', { name: /Continue only for chat/i });
    fireEvent.click(chatOnlyBtn);

    await waitFor(() => {
      expect(authHarness.updateProfile).toHaveBeenCalledWith({
        chat_only: true,
        branch: null,
        hostel: null,
        hostel_block: null,
        mess: null,
      });
    });
  });
});
