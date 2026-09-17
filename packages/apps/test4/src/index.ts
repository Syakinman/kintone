/// <reference types="@kintone/dts-gen" />

(function () {
  'use strict';

  // 监听 Kintone 列表页面加载事件
  kintone.events.on('app.record.index.show', (event) => {
    console.log('Kintone Monorepo 测试脚本运行成功4！', event);
    
    // 在页面顶部弹出一个简单的提示，证明我们的代码生效了
    alert('【测试成功】Kintone Monorepo 脚本已加载4！');
    
    return event;
  });
})();