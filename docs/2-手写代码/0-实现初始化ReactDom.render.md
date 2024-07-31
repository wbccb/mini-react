# 初始化实现createRoot和render

```tsx
import { createRoot } from "react-dom/client";
import App from "./App";

const domNode = document.getElementById("root");
const root = createRoot(domNode!);
root.render(<App />);
```

## ReactDom.createRoot

根据流程图，我们可以知道，主要分为：
- createContainer
- listenToAllSupportedEvents
- return new ReactDOMRoot(root)



## ReactDOMRoot.prototype.render(element)