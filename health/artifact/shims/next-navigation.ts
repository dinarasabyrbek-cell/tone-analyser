import { back, navigate, useRoute } from "../router";

// next/navigation replacement for the hash router.
export function useRouter() {
  return { push: (to: string) => navigate(to), replace: (to: string) => navigate(to, true), refresh: () => {}, back };
}
export function usePathname() {
  return useRoute().path;
}
export function useParams<T extends Record<string, string>>(): T {
  return useRoute().params as T;
}
export function useSearchParams() {
  return useRoute().query;
}
