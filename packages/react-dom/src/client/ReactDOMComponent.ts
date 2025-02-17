export function diffProperties(
	domElement: HTMLElement,
	type: string,
	oldProps: Record<string, any>,
	newProps: Record<string, any>,
) {
	// 3种类型的比较
	// key = children，就是pendingProps，比如文本
	// key = 普通prop
	// key = 事件名称
	const updatePayload: any[] = [];

	for (let oldPropKey in oldProps) {
		if (!newProps[oldPropKey]) {
			// 如果newProps不存在，则需要设置为空

			const oldPropValue = oldProps[oldPropKey];

			updatePayload.push(oldPropKey);

			switch (oldPropKey) {
				case "children":
					if (typeof oldPropValue === "string" || typeof oldPropValue === "number") {
						// domElement.textContent = "";
						updatePayload.push("");
					}
					break;
				default:
					updatePayload.push("");
					break;
			}
		}
	}

	for (let newPropKey in newProps) {
		if (oldProps[newPropKey] && oldProps[newPropKey] === newProps[newPropKey]) {
			continue;
		}
		const newPropValue = newProps[newPropKey];

		switch (newPropKey) {
			case "children":
				{
					if (typeof newPropValue === "string" || typeof newPropValue === "number") {
						// domElement.textContent = "";
						updatePayload.push("children");
						updatePayload.push(newPropValue);
					}
				}
				break;
			default:
				updatePayload.push(newPropKey);
				updatePayload.push(newPropValue);
				break;
		}
	}
	if (updatePayload.length) {
		console.log("====updatePayload====改变了", updatePayload);
	}
	return updatePayload.length ? updatePayload : null;
}

export function updateDOMProperties(domElement: HTMLElement, updatePayload: any[]) {
	for (let i = 0; i < updatePayload.length; i = i + 2) {
		const propKey = updatePayload[i];
		const propValue = updatePayload[i + 1];

		if (propKey === "style") {
			setValueForStyles(domElement, propValue);
		} else if (propKey === "children") {
			setTextContent(domElement, propValue);
		} else {
			(domElement as any)[propKey] = propValue;
			// 事件后面完善
		}
	}
}

function setTextContent(node: HTMLElement, text: string) {
	node.textContent = text;
}

function setValueForStyles(node: HTMLElement, styles: any[]) {
	const style = node.style;
	for (var styleName in styles) {
		if (!style.hasOwnProperty(styleName)) {
			// 这个dom不支持这种styleName
			continue;
		}
		const styleValue = styles[styleName];
		style.setProperty(styleName, styleValue);
	}
}
