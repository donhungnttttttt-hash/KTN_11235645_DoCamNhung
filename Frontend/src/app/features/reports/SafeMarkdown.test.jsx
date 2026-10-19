import React from 'react';
import {expect,it} from 'vitest';
import {render,screen} from '@testing-library/react';
import {SafeMarkdown} from './SafeMarkdown';
it('renders headings lists code and safe links without interpreting HTML or unsafe protocols',()=>{
 const text='# Báo cáo\n\n- OK\n- NG\n\n1. Kiểm tra\n2. Đối chiếu\n\n[Tra cứu](https://example.com/docs) [Xấu](javascript:alert(1))\n\n<img src=x onerror=alert(1)>\n\n```html\n<script>literal</script>\n```';
 const view=render(<SafeMarkdown markdown={text}/>);expect(screen.getByRole('heading',{name:'Báo cáo'})).toBeVisible();expect(screen.getAllByRole('listitem')).toHaveLength(4);expect(screen.getByRole('link',{name:'Tra cứu'})).toHaveAttribute('href','https://example.com/docs');expect(screen.queryByRole('link',{name:'Xấu'})).toBeNull();expect(view.container.querySelector('img,script')).toBeNull();expect(view.container.querySelector('pre code')).toHaveTextContent('<script>literal</script>');
});
it('leaves data relative and encoded unsafe links as literal text',()=>{
 const text='[A](data:text/html,test) [B](/admin) [C](javascript%3Aalert)';render(<SafeMarkdown markdown={text}/>);expect(screen.queryAllByRole('link')).toHaveLength(0);expect(screen.getByText(text)).toBeVisible();
});
it('renders inline code literally and handles empty/unclosed fenced code safely',()=>{
 const view=render(<SafeMarkdown markdown={'###### Petit\n\n`[no link](https://example.com)`\n\n```\n<b>unfinished'}/>);expect(screen.getByRole('heading',{name:'Petit',level:6})).toBeVisible();expect(screen.queryByRole('link')).toBeNull();expect(view.container.querySelectorAll('code')).toHaveLength(2);expect(view.container.querySelector('b')).toBeNull();view.rerender(<SafeMarkdown markdown=""/>);expect(screen.getByText('Chưa có nội dung Markdown.')).toBeVisible();
});
