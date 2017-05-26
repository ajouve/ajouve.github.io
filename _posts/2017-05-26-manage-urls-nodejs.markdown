---
layout: post
title:  "Manage URLs with node.js"
date:   2017-05-26 12:08:25 +0200
categories: node
---

![Manage URLs with node.js]({{ site.url }}/assets/url.jpg)

I always hated working with url using javascript. it was not really funny to get for example the port or the query parameters. 
Now, with the version `7.10` of Node.js, you can now easily manage urls.
You can have the full documentation going to [the official node.js website](https://nodejs.org/api/url.html)

## Get what you want from an URL

Let's try to create an `URL` object and break it down.

{% highlight javascript %}
const {URL} = require('url');
const myUrl = new URL('https://user:pass@blog.ajouve.com:80/node/2017/05/26/manage-urls-nodejs.html?query=string#hash')
{% endhighlight %}

And I have an amazing result, with a lots of usefull data.

{% highlight javascript %}
URL {
  href: 'https://user:pass@blog.ajouve.com:80/node/2017/05/26/manage-urls-nodejs.html?query=string#hash',
  origin: 'https://blog.ajouve.com:80',
  protocol: 'https:',
  username: 'user',
  password: 'pass',
  host: 'blog.ajouve.com:80',
  hostname: 'blog.ajouve.com',
  port: '80',
  pathname: '/node/2017/05/26/manage-urls-nodejs.html',
  search: '?query=string',
  searchParams: URLSearchParams { 'query' => 'string' },
  hash: '#hash' 
}
{% endhighlight %}

As you can see it will really be easier, as I told you before I can now easily access the port on `myUrl.port`.
There is also an object returned in `searchParams` which is [URLSearchParams](#manage-yours-query-parameters).

In a nutshell this is how our url is split

{% highlight html %}
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                      href                                                                          │
├──────────┬┬───────────┬────────────────────────┬───────────────────────────────────────────────────────────┬───────┤
│ protocol ││   auth    │           host         │                           path                            │ hash  │
│          ││           ├─────────────────┬──────┼──────────────────────────────────────────┬────────────────┤       │
│          ││           │    hostname     │ port │                 pathname                 │     search     │       │
│          ││           │                 │      │                                          ├─┬──────────────┤       │
│          ││           │                 │      │                                          │ │    query     │       │
"  http:   // user:pass @ blog.ajouve.com :  80    /node/2017/05/26/manage-urls-nodejs.html  ?  query=string   #hash "
│          ││           │                 │      │                                          │ │              │       │
└──────────┴┴───────────┴─────────────────┴──────┴──────────────────────────────────────────┴─┴──────────────┴───────┘
{% endhighlight %}

## Manage yours query parameters

As you saw before our `URL` object is returning `searchParams`
This object also have usefull methods, for example if you want to check if a param exists you can use `myUrl.searchParams.has('query')`, you can access a param with `myUrl.searchParams.get('query')`. You have can read the full documentation in [the node official website](https://nodejs.org/api/url.html#url_class_urlsearchparams)

## What can we do with that?

Ok now we have an object to manage URLs with node but what can we do ?
I suggest to code a small function which can generate urls with for our view.

Let's define our function:

### generateUrl(path, queryParams)

- `path` `<string>` link path to genrate our url, for example /forum
- `queryParams` `<Object>` query params

{% highlight javascript %}
const url = require('url');

const generateUrl = (path, queryParams) => {
    if(!queryParams) queryParams = {};

    const generatedUrl = url.parse(path);

    const params = new url.URLSearchParams(generatedUrl.query);

    Object.keys(queryParams).forEach(key => {
        params.append(key, queryParams[key]);
    });

    return `${generatedUrl.pathname}${params.toString().length?'?':''}${params.toString()}`;
}
{% endhighlight %}

What are the results ?

{% highlight javascript %}
console.log(generateUrl('/')); // => /
console.log(generateUrl('/', {a: 'b'})); // => /?a=b
console.log(generateUrl('/', {a: 'b', c: 'd'})); // => /?a=b&c=d
console.log(generateUrl('/forum/', {a: 'b'})); // => /forum/?a=b
console.log(generateUrl('/forum?a=b', {c: 'd'})); // => /forum?a=b&c=d
{% endhighlight %}

What this code is doing ?

- first checking if there is a query param and set an empty object if no.
- Generate an `URL` object from the `path`.
- Generate an `URLSearchParams` object, if the path already have query params, they are added to the object.
- loop on the `queryParams` to add them into the `URLSearchParams` object
- Finally return the result with the pathName from the `URL` object and if there is queryParams add them.

Now we have an amazing function to generate urls in our views !

I hope you liked this article and will use node.js url when you need it.

Let me know if you have questions or nice examples using node.js url.

<script type="application/ld+json" >
{
  "@context": "http://schema.org",
  "@type": "TechArticle",
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "{{ site.url }}{{ page.url }}"
  },
  "headline": "Manage URLs with node.js",
  "image": {
    "@type": "ImageObject",
    "url": "{{ site.url }}/assets/url.jpg"
  },
  "datePublished": "{{page.date}}",
  "dateModified": "{{page.date}}",
  "author": {
    "@type": "Person",
    "name": "ajouve"
  }
  "description": "Manage URLs with node.js is now much more easier."
}
</script> 

{% include disqus.html %}