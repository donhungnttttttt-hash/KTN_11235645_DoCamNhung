import React from 'react';
import { expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateProjectDialog } from './CreateProjectDialog';
import { projectsApi } from '../../services/api/projects';

vi.mock('../../services/api/projects',()=>({projectsApi:{create:vi.fn()}}));
vi.mock('./ProjectProvider',()=>({useProject:()=>({refreshProjects:vi.fn()})}));

it('locks the submitted draft and preserves it for retry after a failed create',async()=> {
  let fail;
  projectsApi.create.mockImplementation(()=>new Promise((resolve,reject)=>{fail=reject;}));
  const user=userEvent.setup(),onClose=vi.fn();
  render(<CreateProjectDialog onClose={onClose}/>);
  await user.type(screen.getByLabelText('Mã dự án *'),'DEMO');
  await user.type(screen.getByLabelText('Tên dự án *'),'Dự án kiểm tra');
  await user.click(screen.getByRole('button',{name:'Tạo dự án',exact:true}));
  expect(screen.getByLabelText('Tên dự án *')).toBeDisabled();
  await user.keyboard('{Escape}');expect(onClose).not.toHaveBeenCalled();
  await act(async()=>fail(new Error('Không lưu được')));
  expect(screen.getByRole('alert')).toHaveTextContent('Không lưu được');
  expect(screen.getByLabelText('Tên dự án *')).toBeEnabled();
  expect(screen.getByLabelText('Tên dự án *')).toHaveValue('Dự án kiểm tra');
});
