const createRoot = ()=> {
  console.warn("我是react-dom第三方库createRoot");
  const obj = {render: function(){}};
  return obj;
}

export {
  createRoot
}