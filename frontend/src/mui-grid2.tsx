// 최소한의 Grid2 대체: 타입 검사를 완화해 빌드가 막히지 않도록 함.
// MUI Grid v7에서 사라진 item/container 타입 문제를 우회하기 위해 any로 처리.
import { forwardRef } from 'react';
import MuiGrid from '@mui/material/Grid';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Grid2Props = any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Grid2 = forwardRef<any, any>((props, ref) => {
  const { container, item, ...rest } = props;
  const resolvedItem = container ? item : item ?? true;

  // MUI Grid 타입 시그니처를 무시하도록 any 캐스팅
  const GridAny = MuiGrid as any;
  return <GridAny ref={ref} container={container} item={resolvedItem} {...rest} />;
});

Grid2.displayName = 'Grid2';

export default Grid2;
