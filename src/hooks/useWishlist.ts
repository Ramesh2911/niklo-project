import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { wishlistService, type WishlistItemType } from '../lib/authService';

// Shared by every product-card heart icon (hotels/buses/packages/experiences):
// loads which ids are already saved for this item type, and gives cards a
// single toggle() to call on click. Not logged in -> redirect to /login
// instead of silently failing.
export function useWishlist(itemType: WishlistItemType) {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isLoggedIn) {
      setSavedIds(new Set());
      return;
    }
    wishlistService
      .list(itemType)
      .then((items) => setSavedIds(new Set(items.map((i) => i.item_id))))
      .catch(() => {});
  }, [isLoggedIn, itemType]);

  const isSaved = useCallback((id: string) => savedIds.has(id), [savedIds]);

  const toggle = useCallback(
    async (id: string, rawData?: Record<string, unknown>) => {
      if (!isLoggedIn) {
        navigate('/login');
        return;
      }
      try {
        const res = await wishlistService.toggle(itemType, id, rawData);
        setSavedIds((prev) => {
          const next = new Set(prev);
          if (res.action === 'added') next.add(id);
          else next.delete(id);
          return next;
        });
      } catch {
        // leave state as-is — user can retry the click
      }
    },
    [isLoggedIn, itemType, navigate],
  );

  return { isSaved, toggle };
}
