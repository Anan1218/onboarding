(this.webpackJsonponboarding=this.webpackJsonponboarding||[]).push([[0],{22:function(t,e,n){},27:function(t,e,n){},28:function(t,e,n){},29:function(t,e,n){},30:function(t,e,n){},31:function(t,e,n){},32:function(t,e,n){"use strict";n.r(e);var c=n(3),o=n(6),a=n.n(o),r=n(16),i=n.n(r),u=(n(22),n(7)),d=n(10),s=n(8);n(26),n(27),n(28);function b(t){var e=t.postID,n=Object(o.useState)({postid:"",text:"",author:""}),a=Object(d.a)(n,2),r=a[0],i=a[1];return Object(c.jsxs)("div",{className:"commentInputContainer",children:[Object(c.jsx)("div",{children:"Write a Comment"}),Object(c.jsx)("input",{placeholder:"text",onChange:function(t){return i(Object(u.a)(Object(u.a)({},r),{},{text:t.target.value,postid:e}))}}),Object(c.jsx)("input",{placeholder:"author",onChange:function(t){return i(Object(u.a)(Object(u.a)({},r),{},{author:t.target.value,postid:e}))}}),Object(c.jsx)("button",{type:"button",onClick:function(){s.a.firestore().collection("comments").add(r)},children:"Submit"})]})}b.defaultProps={postID:""};n(29);function j(t){var e=t.text,n=t.author;return Object(c.jsxs)("div",{children:[Object(c.jsx)("div",{className:"body",children:e}),Object(c.jsx)("div",{children:n})]})}function l(t){var e=t.title,n=t.body,a=t.author,r=t.date,i=t.docID,u=Object(o.useState)([]),l=Object(d.a)(u,2),p=l[0],h=l[1];return Object(o.useEffect)((function(){s.a.firestore().collection("comments").where("postid","==",{docID:i}).get().then((function(t){h(t.docs.map((function(t){return t.data()})))})),s.a.firestore().collection("comments").onSnapshot((function(t){h(t.docs.map((function(t){return t.data()})))}))}),[]),Object(c.jsxs)("div",{className:"postContainer",children:[Object(c.jsx)("div",{className:"title",children:e}),Object(c.jsx)("div",{children:n}),Object(c.jsx)("div",{children:a}),Object(c.jsx)("div",{children:r}),Object(c.jsx)(b,{postID:i}),Object(c.jsx)("div",{className:"commentContainer",children:p.map((function(t){return Object(c.jsx)(j,{author:"author: ".concat(t.author),text:t.text})}))})]})}j.defaultProps={author:"",text:""},l.defaultProps={title:"",body:"",author:"",date:"",docID:""};n(30);function p(){var t=Object(o.useState)({title:"",body:"",author:"",date:""}),e=Object(d.a)(t,2),n=e[0],a=e[1],r=Object(o.useRef)(!1);return Object(o.useEffect)((function(){r.current?s.a.firestore().collection("posts").add(n):r.current=!0}),[n.date]),Object(c.jsxs)("div",{className:"postInputContainer",children:[Object(c.jsx)("div",{children:"LEAVE A POST"}),Object(c.jsx)("input",{placeholder:"title",onChange:function(t){return a(Object(u.a)(Object(u.a)({},n),{},{title:t.target.value}))}}),Object(c.jsx)("input",{placeholder:"body",onChange:function(t){return a(Object(u.a)(Object(u.a)({},n),{},{body:t.target.value}))}}),Object(c.jsx)("input",{placeholder:"author",onChange:function(t){return a(Object(u.a)(Object(u.a)({},n),{},{author:t.target.value}))}}),Object(c.jsx)("button",{type:"button",onClick:function(){return function(){var t=(new Date).toLocaleDateString();a((function(){return Object(u.a)(Object(u.a)({},n),{},{date:t})}))}()},children:"Submit"})]})}n(31);s.a.apps.length||s.a.initializeApp({apiKey:"AIzaSyBOvNYjBtwrgzhmFd6QvHr4StEaetN2EmM",authDomain:"onboarding-9b923.firebaseapp.com",databaseURL:"https://onboarding-9b923.firebaseio.com",projectId:"onboarding-9b923",storageBucket:"onboarding-9b923.appspot.com",messagingSenderId:"66559203020",appId:"1:66559203020:web:b6462aebf790752b7d1469"});var h=function(){var t=Object(o.useState)([]),e=Object(d.a)(t,2),n=e[0],a=e[1];return Object(o.useEffect)((function(){s.a.firestore().collection("posts").orderBy("date").get().then((function(t){a(t.docs.map((function(t){return Object(u.a)({id:t.id},t.data())})))})),s.a.firestore().collection("posts").orderBy("date").onSnapshot((function(t){a(t.docs.map((function(t){return Object(u.a)({id:t.id},t.data())})))}))}),[]),Object(c.jsxs)(c.Fragment,{children:[n.map((function(t){return Object(c.jsx)(l,{title:"title: ".concat(t.title),body:"body: ".concat(t.body),author:"author: ".concat(t.author),date:"date: ".concat(t.date),docID:t.id})})),Object(c.jsx)(p,{})]})};i.a.render(Object(c.jsx)(a.a.StrictMode,{children:Object(c.jsx)(h,{})}),document.getElementById("root"))}},[[32,1,2]]]);
//# sourceMappingURL=main.595705ac.chunk.js.map