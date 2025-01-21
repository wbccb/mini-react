import{_ as o,c as a,a0 as t,o as c}from"./chunks/framework.BZW3-RJc.js";const h=JSON.parse('{"title":"前言","description":"","frontmatter":{},"headers":[],"relativePath":"3-源码解析/(WIP)常见hook源码分析.md","filePath":"3-源码解析/(WIP)常见hook源码分析.md"}'),s={name:"3-源码解析/(WIP)常见hook源码分析.md"};function d(l,e,r,u,n,i){return c(),a("div",null,e[0]||(e[0]=[t('<h1 id="前言" tabindex="-1">前言 <a class="header-anchor" href="#前言" aria-label="Permalink to &quot;前言&quot;">​</a></h1><p>在<code>React 18</code>中，我们详细分析了各种类型，比如<code>HostComponent</code>、<code>FunctionComponent</code>的初次渲染和渲染更新的流程，但是我们还没仔细分析过<code>React</code>重要的<code>React Hooks</code>相关源码</p><ul><li>比如最常见的<code>useEffect()</code></li><li>比如性能优化经常使用的<code>useMemo()</code>、<code>useCallback()</code></li></ul><p>在本文中，我们将针对这些常见的<code>hooks</code>，侧重于<code>useEffect()</code>和<code>useLayoutEffect()</code>，详细分析<code>React Hooks</code>初次渲染和渲染更新的流程</p><h1 id="useeffect" tabindex="-1">useEffect() <a class="header-anchor" href="#useeffect" aria-label="Permalink to &quot;useEffect()&quot;">​</a></h1><h1 id="uselayouteffect" tabindex="-1">useLayoutEffect() <a class="header-anchor" href="#uselayouteffect" aria-label="Permalink to &quot;useLayoutEffect()&quot;">​</a></h1><h1 id="usememo" tabindex="-1">useMemo() <a class="header-anchor" href="#usememo" aria-label="Permalink to &quot;useMemo()&quot;">​</a></h1><h1 id="usecallback" tabindex="-1">useCallback() <a class="header-anchor" href="#usecallback" aria-label="Permalink to &quot;useCallback()&quot;">​</a></h1>',8)]))}const m=o(s,[["render",d]]);export{h as __pageData,m as default};
