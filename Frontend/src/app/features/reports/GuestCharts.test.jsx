import React from 'react';
import {it,expect} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
import {TrendChart,RingChart,QualityChart} from './GuestCharts';

const series=[{key:'planned',name:'Mục tiêu',color:'#e9af43'},{key:'tested',name:'Đã test',color:'#00998c'}];
it('shows a labeled comparison rather than an almost empty line chart for a single day',()=>{
 const {container}=render(<TrendChart rows={[{day:'2026-11-15',planned:338,tested:338}]} series={series} label="Tiến độ"/>);
 expect(screen.getByText(/Mới có 1 ngày/)).toBeVisible();
 expect(screen.getAllByText('338')).toHaveLength(2);
 expect(screen.getByRole('img',{name:'Tiến độ'})).toBeVisible();
 expect(container.querySelector('polyline')).toBeNull();
});
it('distinguishes missing observations from an observed zero',()=>{
 render(<TrendChart rows={[{day:'2026-11-15',planned:null,tested:0}]} series={series} label="Tiến độ"/>);
 expect(screen.getByText('Chưa ghi nhận')).toBeVisible();
 expect(screen.getByText('0')).toBeVisible();
});
it('shows zero-only observations explicitly without an empty numeric axis',()=>{
 const {container}=render(<TrendChart rows={[{day:'2026-11-14',cost:0},{day:'2026-11-15',cost:0}]} series={[{key:'cost',name:'Chi phí',color:'#637cc2'}]} label="Chi phí"/>);
 expect(screen.getByText(/Các giá trị đã ghi nhận đều bằng 0/)).toBeVisible();
 expect(container.querySelector('polyline')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Xem số liệu'}));
 expect(screen.getByRole('table')).toHaveTextContent('2026-11-14');
});
it('keeps gaps in multi-day data and does not draw missing values as zero',()=>{
 const {container}=render(<TrendChart rows={[{day:'2026-11-13',tested:1},{day:'2026-11-14',tested:null},{day:'2026-11-15',tested:3}]} series={[series[1]]} label="Tiến độ"/>);
 expect(container.querySelectorAll('circle')).toHaveLength(2);
 expect(container.querySelectorAll('polyline')).toHaveLength(0);
 fireEvent.click(screen.getByRole('button',{name:'Xem số liệu'}));
 expect(screen.getByRole('table')).toHaveTextContent('Chưa ghi nhận');
});
it('draws observed multi-day trends and allows opening and closing the data table',()=>{
 const {container}=render(<TrendChart rows={[{day:'2026-11-14',tested:10,planned:20},{day:'2026-11-15',tested:30,planned:40}]} series={series} label="Tiến độ"/>);
 expect(container.querySelectorAll('polyline')).toHaveLength(2);
 expect(container.querySelectorAll('circle')).toHaveLength(4);
 fireEvent.click(screen.getByRole('button',{name:'Xem số liệu'}));
 expect(screen.getByRole('table')).toHaveTextContent('40');
 fireEvent.click(screen.getByRole('button',{name:'Ẩn số liệu'}));
 expect(screen.queryByRole('table')).toBeNull();
});
it('splits each observed segment at missing days',()=>{
 const {container}=render(<TrendChart rows={[{day:'1',tested:1},{day:'2',tested:2},{day:'3',tested:null},{day:'4',tested:3},{day:'5',tested:4}]} series={[series[1]]} label="Tiến độ"/>);
 expect(container.querySelectorAll('polyline')).toHaveLength(2);
});
it('reports missing history and missing measures without inventing observations',()=>{
 const view=render(<TrendChart rows={[]} series={series} label="Tiến độ"/>);
 expect(screen.getByText(/Chưa có lịch sử quan sát/)).toBeVisible();
 view.rerender(<TrendChart rows={[{day:'1'},{day:'2',tested:'invalid'}]} series={series} label="Tiến độ"/>);
 expect(screen.getByText(/Chưa ghi nhận giá trị cho các chỉ số/)).toBeVisible();
 expect(screen.getAllByText('Chưa ghi nhận')).toHaveLength(2);
});
it('renders empty distributions as zero with neutral rings',()=>{
 render(<><RingChart label="Nhân sự" value="0" unit="người" items={[{label:'User',value:0,color:'teal'}]}/><QualityChart metrics={{total:0,ok:0,ng:0,pending:0,na:0,notRun:0}}/></>);
 expect(screen.getByRole('img',{name:'Nhân sự: User 0'})).toBeVisible();
 expect(screen.getByRole('img',{name:'Trạng thái 0 case'})).toBeVisible();
});
