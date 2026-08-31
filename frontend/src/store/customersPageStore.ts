import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface CustomersPageState {
  // 검색 및 필터 상태
  searchText: string;
  versionFilter: string;
  inspectionCycleFilter: string;
  inspectionStatusFilter: string;
  contractTypeFilter: string;

  // DataGrid 상태
  pageSize: number;
  page: number;

  // 스크롤 위치
  scrollPosition: number;

  // 상태 업데이트 함수
  setSearchText: (text: string) => void;
  setVersionFilter: (filter: string) => void;
  setInspectionCycleFilter: (filter: string) => void;
  setInspectionStatusFilter: (filter: string) => void;
  setContractTypeFilter: (filter: string) => void;
  setPageSize: (size: number) => void;
  setPage: (page: number) => void;
  setScrollPosition: (position: number) => void;
}

const initialState = {
  searchText: '',
  versionFilter: '',
  inspectionCycleFilter: '',
  inspectionStatusFilter: '',
  contractTypeFilter: '',
  pageSize: 25,
  page: 0,
  scrollPosition: 0,
};

export const useCustomersPageStore = create<CustomersPageState>()(
  persist(
    (set) => ({
      ...initialState,

      setSearchText: (text) => set({ searchText: text }),
      setVersionFilter: (filter) => set({ versionFilter: filter }),
      setInspectionCycleFilter: (filter) => set({ inspectionCycleFilter: filter }),
      setInspectionStatusFilter: (filter) => set({ inspectionStatusFilter: filter }),
      setContractTypeFilter: (filter) => set({ contractTypeFilter: filter }),
      setPageSize: (size) => set({ pageSize: size }),
      setPage: (page) => set({ page: page }),
      setScrollPosition: (position) => set({ scrollPosition: position }),
    }),
    {
      name: 'customers-page-state',
      // 인증과 동일하게 세션 단위로만 유지 (로그아웃/계정 전환 시 이전 검색어·필터가 남지 않도록)
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
