import { act, renderHook, waitFor } from '@testing-library/react';
import type { Intro } from '@/types';
import { useSpamActions } from '../useSpamActions';

jest.mock('@/lib/supabase/intros', () => ({
  countSpamGroup: jest.fn().mockResolvedValue(2),
  markSpamGroup: jest.fn().mockResolvedValue(['a1', 'b2']),
  undoSpamMark: jest.fn().mockResolvedValue(undefined),
  restoreSpamGroup: jest.fn().mockResolvedValue(['a1']),
  dismissSpamWarning: jest.fn().mockResolvedValue(undefined),
}));

import * as api from '@/lib/supabase/intros';

const intro = { id: 'a1', name: 'Sample Person' } as Intro;

beforeEach(() => {
  jest.clearAllMocks();
  window.alert = jest.fn();
});

it('mark: shows the count, marks the group, then undo reverts exactly the changed ids', async () => {
  const onChanged = jest.fn();
  const { result } = renderHook(() => useSpamActions(onChanged));

  act(() => result.current.openConfirm(intro, 'mark'));
  await waitFor(() => expect(result.current.confirm?.count).toBe(2));

  await act(() => result.current.confirmAction());
  expect(api.markSpamGroup).toHaveBeenCalledWith(intro);
  expect(result.current.undoIds).toEqual(['a1', 'b2']);
  expect(result.current.confirm).toBeNull();
  expect(onChanged).toHaveBeenCalledTimes(1);

  await act(() => result.current.undo());
  expect(api.undoSpamMark).toHaveBeenCalledWith(['a1', 'b2']);
  expect(result.current.undoIds).toBeNull();
  expect(onChanged).toHaveBeenCalledTimes(2);
});

it('restore: restores the group and does not offer undo', async () => {
  const { result } = renderHook(() => useSpamActions(jest.fn()));
  act(() => result.current.openConfirm(intro, 'restore'));
  await act(() => result.current.confirmAction());
  expect(api.restoreSpamGroup).toHaveBeenCalledWith(intro);
  expect(result.current.undoIds).toBeNull();
});

it('failures alert instead of throwing', async () => {
  (api.markSpamGroup as jest.Mock).mockRejectedValueOnce(new Error('boom'));
  const { result } = renderHook(() => useSpamActions(jest.fn()));
  act(() => result.current.openConfirm(intro, 'mark'));
  await act(() => result.current.confirmAction());
  expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('boom'));
});
