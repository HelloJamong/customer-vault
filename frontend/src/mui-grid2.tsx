// 최소한의 Grid2 대체: 타입 검사를 완화해 빌드가 막히지 않도록 함.
// MUI Grid v7에서 사라진 item/container 타입 문제를 우회하기 위해 any로 처리.
//
// MUI v7 Grid는 레거시 xs/sm/md/lg/xl props를 지원하지 않고 조용히 제거한다
// (@mui/system/Grid/deleteLegacyGridProps). size={{ xs, sm, ... }} 형태만 폭 계산에 쓰이므로
// 여기서 레거시 props를 size로 변환해준다.
import { forwardRef, type ComponentProps } from 'react';
import MuiGrid from '@mui/material/Grid';

type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type BreakpointValue = number | 'auto';

const BREAKPOINTS: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl'];

export type Grid2Props = ComponentProps<typeof MuiGrid> & {
  item?: boolean;
  xs?: BreakpointValue;
  sm?: BreakpointValue;
  md?: BreakpointValue;
  lg?: BreakpointValue;
  xl?: BreakpointValue;
};

const Grid2 = forwardRef<HTMLDivElement, Grid2Props>((props, ref) => {
  const { container, item, xs, sm, md, lg, xl, size, ...rest } = props;
  void item; // MUI v7 Grid에 더 이상 필요 없는 legacy prop이라 제거만 한다
  const legacySize = { xs, sm, md, lg, xl };
  const hasLegacySize = BREAKPOINTS.some((bp) => legacySize[bp] !== undefined);
  const mergedSize = hasLegacySize
    ? { ...legacySize, ...(typeof size === 'object' && size !== null ? size : {}) }
    : size;

  return <MuiGrid ref={ref} container={container} size={mergedSize} {...rest} />;
});

Grid2.displayName = 'Grid2';

export default Grid2;
