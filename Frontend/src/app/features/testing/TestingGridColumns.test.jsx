import React,{useState} from 'react';
import {fireEvent,render,screen} from '@testing-library/react';
import {expect,it} from 'vitest';
import {ColumnResizeHandle,testingColumnWidth,approvedTestColumns,testerNames} from './TestingGridColumns';

it('projects only approved fields in display order while preserving their original edit indices',()=>{
 const columns=approvedTestColumns({headers:['Cột riêng','No','ID redmine',' Điều kiện\nTIỀN ĐỀ ','ID','Mục xác nhận','Các bước test'],columns:{sourceId:4,preconditionsVi:3,stepsVi:6,confirmation:5}});
 expect(columns.map(c=>c.key)).toEqual(['sourceId','sourceNo','titleVi','preconditionsVi','stepsVi','viewpoint','confirmation','expectedVi','designNote']);
 expect(columns.map(c=>c.index)).toEqual([4,1,undefined,3,6,undefined,5,undefined,undefined]);
 expect(testerNames({firstTesterName:'An',latestTesterName:'An'})).toEqual(['An']);
 expect(testerNames({firstTesterName:'An',latestTesterName:'Bình'})).toEqual(['An']);
 expect(testerNames({})).toEqual([]);
});

function Column(){
 const [width,setWidth]=useState(160);
 return <ColumnResizeHandle label="Nội dung" width={width} defaultWidth={160} onResize={setWidth}/>;
}
it('reserves narrow identities and wider multiline content even with reordered source columns',()=>{
 const columns={sourceId:2,stepsVi:0,expectedVi:3};
 expect(testingColumnWidth({index:2,label:'ID'},columns,2)).toBe(64);
 expect(testingColumnWidth({index:0,label:'Các bước'},columns,2)).toBe(320);
 expect(testingColumnWidth({index:3,label:'Kỳ vọng'},columns,2)).toBe(270);
 expect(testingColumnWidth({index:-1,label:'MT & Ver'},columns,2)).toBe(190);
 expect(testingColumnWidth({index:1,label:'No'},columns,2)).toBe(56);
 expect(testingColumnWidth({index:4,label:'Tùy chỉnh'},columns,2)).toBe(160);
});
it('bounds keyboard sizing and restores the initial width with a double click',()=>{
 render(<Column/>);const handle=screen.getByRole('separator');
 fireEvent.keyDown(handle,{key:'Home'});expect(handle).toHaveAttribute('aria-valuenow','56');
 fireEvent.keyDown(handle,{key:'ArrowLeft'});expect(handle).toHaveAttribute('aria-valuenow','56');
 fireEvent.keyDown(handle,{key:'End'});expect(handle).toHaveAttribute('aria-valuenow','720');
 fireEvent.keyDown(handle,{key:'ArrowRight'});expect(handle).toHaveAttribute('aria-valuenow','720');
 fireEvent.doubleClick(handle);expect(handle).toHaveAttribute('aria-valuenow','160');
 fireEvent.keyDown(handle,{key:'Tab'});expect(handle).toHaveAttribute('aria-valuenow','160');
});
it('resizes by pointer movement and stops applying movement after release',()=>{
 render(<Column/>);const handle=screen.getByRole('separator');
 const pointer=(target,type,values)=>{const event=new Event(type,{bubbles:true});Object.assign(event,values);fireEvent(target,event);};
 pointer(handle,'pointerdown',{button:0,clientX:100,pointerId:1});
 pointer(window,'pointermove',{clientX:180,pointerId:1});expect(handle).toHaveAttribute('aria-valuenow','240');
 pointer(window,'pointerup',{pointerId:1});pointer(window,'pointermove',{clientX:240,pointerId:1});expect(handle).toHaveAttribute('aria-valuenow','240');
 pointer(handle,'pointerdown',{button:2,clientX:100,pointerId:2});pointer(window,'pointermove',{clientX:200,pointerId:2});expect(handle).toHaveAttribute('aria-valuenow','240');
});
