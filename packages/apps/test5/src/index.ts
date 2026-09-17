

// 引入外部两个 TS 模块
import { fetchAppData } from './api';
import { showNotification } from './utils';

// 引入独立 CSS（打包工具会自动将它提取或注入）
import './style.css';

(function () {
  'use strict';

  kintone.events.on('app.record.index.show', (event) => {
    const data = fetchAppData();
    
    // 调用另一个模块的函数展示 UI
    showNotification(`🚀 ${data.title} 加载成功2！`);
    
    return event;
  });
})();