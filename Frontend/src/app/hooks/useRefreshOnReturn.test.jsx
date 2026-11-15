import React from 'react';
import {render,fireEvent} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {useRefreshOnReturn} from './useRefreshOnReturn';
it('reads once on window return, ignores field focus and removes the listener on unmount',()=>{
 const refresh=vi.fn();function View(){useRefreshOnReturn(refresh);return <input aria-label="Draft"/>;}
 const view=render(<View/>);fireEvent.focus(view.getByLabelText('Draft'));expect(refresh).not.toHaveBeenCalled();
 fireEvent.focus(window);expect(refresh).toHaveBeenCalledTimes(1);view.unmount();fireEvent.focus(window);expect(refresh).toHaveBeenCalledTimes(1);
});
