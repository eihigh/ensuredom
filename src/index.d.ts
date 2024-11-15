export declare function ensure(parent: HTMLElement): void;
export declare function ensure(parent: HTMLElement, tagName: string, key?: any): HTMLElement;
export declare function ensure(parent: HTMLElement, vnode: VNode): HTMLElement;

export type VNode = {
	_ensuredom: boolean;
	type: string;
	props: any;
	children: any[];
};

export declare const React: {
	createElement: (type: string, props: any, ...children: any[]) => VNode;
};