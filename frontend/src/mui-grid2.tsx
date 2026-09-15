// 최소한의 Grid2 대체: 타입 검사를 완화해 빌드가 막히지 않도록 함.
// MUI Grid v7에서 사라진 item/container 타입 문제를 우회하기 위해 any로 처리.
import { forwardRef, type ComponentProps } from 'react';
import MuiGrid from '@mui/material/Grid';

export type Grid2Props = ComponentProps<typeof MuiGrid> & {
  item?: boolean;
  xs?: number | 'auto';
  sm?: number | 'auto';
  md?: number | 'auto';
  lg?: number | 'auto';
  xl?: number | 'auto';
};

const Grid2 = forwardRef<HTMLDivElement, Grid2Props>((props, ref) => {
  const { container } = props;
  const rest = { ...props };
  delete rest.item;
  return <MuiGrid ref={ref} container={container} {...rest} />;
});

Grid2.displayName = 'Grid2';

export default Grid2;
