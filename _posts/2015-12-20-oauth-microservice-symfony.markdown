---
layout: post
title:  "Create a microservice using Symfony and OAuth2"
date:   2015-12-19 19:30:49 +0000
categories: Symfony2 OAuth2 Microservice

# Disqus
comments: true
---

The goal of this tutorial is to create two Symfony2 applications using an API secured by OAuth2 to communicate.
We will create an application to get the current date and an other one to display the time.

## Requirements

### Composer

Composer is a dependency manager for PHP
We will install it globally for an easier usage

    $ curl -sS https://getcomposer.org/installer | php
    $ mv composer.phar /usr/local/bin/composer

now the `composer` command is available

### Symfony Installer

The Symfony Installer is a small PHP application that must be installed once in your computer. It greatly simplifies the creation of new projects based on the Symfony framework.

    $ sudo curl -LsS http://symfony.com/installer -o /usr/local/bin/symfony
    $ sudo chmod a+x /usr/local/bin/symfony

## Date API

We will create a simple API which is returning the current date.

### Create our application

Let's create our API to access and edit our customers.

    $ symfony new time-api 2.8
    $ cd time-api

Now create a controller to access the date

{% highlight php %}
<?php

// AppBundle/Controller/DateController.php

namespace AppBundle\Controller;

use Sensio\Bundle\FrameworkExtraBundle\Configuration\Method;
use Sensio\Bundle\FrameworkExtraBundle\Configuration\Route;
use Symfony\Component\HttpFoundation\JsonResponse;

/**
 * @Route("/api/time")
 */
class DateController
{
    /**
     * @Route("/")
     * @Method({"GET"})
     */
    public function getAction()
    {
        $date = new \DateTime();

        return new JsonResponse([
            'date' => $date->format('Y-m-d'),
            'time' => $date->format('H:i:s')
        ]);
    }
}
{% endhighlight %}

Let's try if our API works.
First start our server

    app/console server:run

Now go to `http://127.0.0.1:8000/api/time/`, you should have something like

    {"date":"{{ site.time | date: '%Y-%m-%d' }}","time":"{{ site.time | date: '%H-%M-%S' }}"}

### Secure the API

We will use [FOSOAuthServerBundle](https://github.com/FriendsOfSymfony/FOSOAuthServerBundle/blob/master/Resources/doc/index.md){:target="_blank"} to create the OAuth2 server

#### Create the OAuth server

The installation will be limited to our use case you can have more details [there](https://github.com/FriendsOfSymfony/FOSOAuthServerBundle/blob/master/Resources/doc/index.md){:target="_blank"}

First install the plugin

    $ composer require friendsofsymfony/oauth-server-bundle

Enable the bundle

{% highlight php %}
<?php
// app/AppKernel.php

public function registerBundles()
{
$bundles = array(
    // ...
    new FOS\OAuthServerBundle\FOSOAuthServerBundle(),
);
}
{% endhighlight %}

Now we need to create 2 entities to manage our OAuth credentials

{% highlight php %}
<?php
// AppBundle/Entity/Client.php

namespace AppBundle\Entity;

use FOS\OAuthServerBundle\Entity\Client as BaseClient;
use Doctrine\ORM\Mapping as ORM;

/**
 * @ORM\Entity
 */
class Client extends BaseClient
{
    /**
     * @ORM\Id
     * @ORM\Column(type="integer")
     * @ORM\GeneratedValue(strategy="AUTO")
     */
    protected $id;
}
{% endhighlight %}

The Client will store the `client_id` and `client_secret`.

{% highlight php %}
<?php
// AppBundle/Entity/AccessToken.php

namespace AppBundle\Entity;

use FOS\OAuthServerBundle\Entity\AccessToken as BaseAccessToken;
use Doctrine\ORM\Mapping as ORM;

/**
 * @ORM\Entity
 */
class AccessToken extends BaseAccessToken
{
    /**
     * @ORM\Id
     * @ORM\Column(type="integer")
     * @ORM\GeneratedValue(strategy="AUTO")
     */
    protected $id;

    /**
     * @ORM\ManyToOne(targetEntity="Client")
     * @ORM\JoinColumn(nullable=false)
     */
    protected $client;

}
{% endhighlight %}

The AccessToken will store the generated token from the Client.

To finish update the configuration

    # app/config/config.yml
    fos_oauth_server:
        db_driver: orm
        client_class:        AppBundle\Entity\Client
        access_token_class:  AppBundle\Entity\AccessToken
        refresh_token_class: FOS\OAuthServerBundle\Entity\RefreshToken # Not used in this example
        auth_code_class:     FOS\OAuthServerBundle\Entity\AuthCode # Not used in this example

Update the routing

    # app/config/routing.yml
    app:
        resource: "@AppBundle/Controller/"
        type:     annotation

    fos_oauth_server_token:
        resource: "@FOSOAuthServerBundle/Resources/config/routing/token.xml"

And edit the security

    # app/config/security.yml
    security:
        providers:
            in_memory:
                memory: ~

        firewalls:
            oauth_token:
                pattern:    ^/oauth/v2/token
                security:   false

            api:
                pattern:    ^/api
                fos_oauth:  true
                stateless:  true

        access_control:
            # You can omit this if /api can be accessed both authenticated and anonymously
            - { path: ^/api, roles: [ IS_AUTHENTICATED_FULLY ] }


Now we will need an access token to access all the urls beginning by `/api`

If you try to access `http://127.0.0.1:8000/api/time`, you should have
`{"error":"access_denied","error_description":"OAuth2 authentication required"}`

#### Test our secured api

First we need to create a `client_id` and a `client_secret` to generate an `access_token`.
I have a command for that:

{% highlight php %}
<?php
// AppBundle/Command/OAuthCreateClientCommand.php

namespace AppBundle\Command;

use FOS\OAuthServerBundle\Entity\ClientManager;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

class OAuthCreateClientCommand extends Command
{
    const OPTION_REDIRECT_URI = 'redirect-uri';
    const OPTION_GRANT_TYPE = 'grant-type';

    /**
     * @var ClientManager
     */
    private $clientManager;

    public function __construct(ClientManager $clientManager)
    {
        parent::__construct();

        $this->clientManager = $clientManager;
    }

    /**
     * {@inheritdoc}
     */
    protected function configure()
    {
        $this
            ->setName('oauth:client:create')
            ->setDescription('Create a new OAuth client')
            ->addOption(
                self::OPTION_REDIRECT_URI,
                null,
                InputOption::VALUE_OPTIONAL | InputOption::VALUE_IS_ARRAY,
                'If set add a redirect uri'
            )
            ->addOption(
                self::OPTION_GRANT_TYPE,
                null,
                InputOption::VALUE_OPTIONAL | InputOption::VALUE_IS_ARRAY,
                'If set add a grant type'
            )
        ;
    }

    protected function execute(InputInterface $input, OutputInterface $output)
    {
        $client = $this->clientManager->createClient();
        $client->setRedirectUris($input->getOption(self::OPTION_REDIRECT_URI));
        $client->setAllowedGrantTypes($input->getOption(self::OPTION_GRANT_TYPE));
        $this->clientManager->updateClient($client);

        $output->writeln('Client created');
        $output->writeln('client_id='.$client->getId().'_'.$client->getRandomId());
        $output->writeln('client_secret='.$client->getSecret());
    }
}

{% endhighlight %}

Add the command to yours services

{% highlight yaml %}
# app/config/services.yml
services:
    command.oauth_create_client:
        class: AppBundle\Command\OAuthCreateClientCommand
        arguments:
            - @fos_oauth_server.client_manager.default
        tags:
            -  { name: console.command }
{% endhighlight %}

Call the command to generate our client

    $ app/console oauth:client:create --grant-type="client_credentials"

The result should be something like:

    Client created
    client_id={YOUR_CLIENT_ID}
    client_secret={YOUR_CLIENT_SECRET}

Now we can generate our token, calling the following url

    http://127.0.0.1:8000/oauth/v2/token?client_id={YOUR_CLIENT_ID}&client_secret={YOUR_CLIENT_SECRET}&grant_type=client_credentials

And you should receive your access_token

    {"access_token":"{MY_ACCESS_TOKEN}","expires_in":3600,"token_type":"bearer","scope":null}

This token will expire in 3600s, you can update this value in the configuration.

Now go to `http://127.0.0.1:8000/api/time?access_token={MY_ACCESS_TOKEN}`, you should have the date !

    {"date":"{{ site.time | date: '%Y-%m-%d' }}","time":"{{ site.time | date: '%H-%M-%S' }}"}

You can access full `time-api` code on [Github](https://github.com/ajouve/time-api){:target="_blank"}

## Date reader

Now we will create a new Symfony application to display the date received from the API

### Create the application

    $ symfony new time-reader 2.8
    $ cd time-reader

And start the application on an other port not used by the API

    $ app/console server:run -p 8001

### Display the date

I am using [guzzle-oauth2-plugin](https://github.com/commerceguys/guzzle-oauth2-plugin){:target="_blank"} to manage the OAuth.
This plugin is using [Guzzle](https://github.com/guzzle/guzzle){:target="_blank"} which is a PHP HTTP client that makes it easy to send HTTP requests and trivial to integrate with web services.

    $ composer require commerceguys/guzzle-oauth2-plugin:2.0.*

I have the following controller

{% highlight php %}
<?php
// src/AppBundle/Controller/DefaultController.php

namespace AppBundle\Controller;

use CommerceGuys\Guzzle\Oauth2\GrantType\ClientCredentials;
use CommerceGuys\Guzzle\Oauth2\Oauth2Subscriber;
use GuzzleHttp\Client;
use Sensio\Bundle\FrameworkExtraBundle\Configuration\Route;
use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\Response;

class DefaultController extends Controller
{
    /**
     * @Route("/", name="homepage")
     */
    public function indexAction()
    {
        $base_url = 'http://127.0.0.1:8000';

        $oauth2Client = new Client(['base_url' => $base_url]);

        $config = [
            'client_id' => '{CLIENT_ID}',
            'client_secret' => '{CLIENT_SECRET}',
            'token_url' => '/oauth/v2/token'
        ];

        $token = new ClientCredentials($oauth2Client, $config);

        $oauth2 = new Oauth2Subscriber($token);

        $client = new Client([
            'defaults' => [
                'auth' => 'oauth2',
                'subscribers' => [$oauth2],
            ],
        ]);

        $response = $client->get('http://127.0.0.1:8000/api/time');

        $result = json_decode($response->getBody(), true);

        return new Response(sprintf(
            "Date from the API <br/> Date: %s <br/> Time: %s",
            $result['date'],
            $result['time']
        ));
    }
}

{% endhighlight %}

First we create our Guzzle client, we will use this client to make call our API.

Then we set up our client configuration and generate our client credentials.

To finish we send a request to our API. Everything is managed automatically, first the client is calling `/oauth/v2/token` then go to `/api/time`, you didn't need to manage the access token.

### Improvements

In this controller we will generate a new access_token for each request. Now we will wait the token expiration until generating a new one.

We will use [memcached](http://memcached.org/){:target="_blank"} to cache the access token. Memcached is an in-memory key-value store for small chunks of arbitrary data (strings, objects) from results of database calls, API calls, or page rendering.

Install memcached on your server

    $ sudo apt-get update
    $ sudo apt-get install php5-memcached memcached

Make sure the memcached server is running

    $ service memcached status

If not run

    $ sudo service memcached start

Now we can update our controller

{% highlight php %}
<?php
// src/AppBundle/Controller/DefaultController.php

namespace AppBundle\Controller;

use CommerceGuys\Guzzle\Oauth2\GrantType\ClientCredentials;
use CommerceGuys\Guzzle\Oauth2\Oauth2Subscriber;
use GuzzleHttp\Client;
use Sensio\Bundle\FrameworkExtraBundle\Configuration\Route;
use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\Response;

class DefaultController extends Controller
{
    /**
     * @Route("/", name="homepage")
     */
    public function indexAction()
    {
      $base_url = 'http://127.0.0.1:8000';

      $oauth2Client = new Client(['base_url' => $base_url]);

      $config = [
          'client_id' => '{CLIENT_ID}',
          'client_secret' => '{CLIENT_SECRET}',
          'token_url' => '/oauth/v2/token'
      ];

      $memcached = new \Memcached();
      $memcached->addServer('localhost', 11211);

      $token = new ClientCredentials($oauth2Client, $config);
      $oauth2 = new Oauth2Subscriber($token);

      // Check if we have the cache key
      if (false !== $cachedAccessToken = $memcached->get(self::ACCESS_TOKEN_CACHE_KEY_PREFIX)) {
          $oauth2->setAccessToken($cachedAccessToken);
      }

      // Update the cache token with the access token
      $memcached->set(self::ACCESS_TOKEN_CACHE_KEY_PREFIX, $oauth2->getAccessToken());

      $client = new Client([
          'defaults' => [
              'auth' => 'oauth2',
              'subscribers' => [$oauth2],
          ],
      ]);

      $response = $client->get('http://127.0.0.1:8000/api/time');

      $result = json_decode($response->getBody(), true);

      return new Response(sprintf(
          "Date from the API <br/> Date: %s <br/> Time: %s",
          $result['date'],
          $result['time']
      ));
    }
}

{% endhighlight %}

Now our token will only be regenerate if expired.

You can access full `time-reader` code on [Github](https://github.com/ajouve/time-reader){:target="_blank"}
In the github example I am not using `http://127.0.0.1:8000` to call my api but `http://time-api.local`

I hope this tutorial will be useful for you, if you have any problem or remark you can contact me on twitter, just have a look to the footer for the details ;)

Github repositories:

* [time-api](https://github.com/ajouve/time-api){:target="_blank"}
* [time-reader](https://github.com/ajouve/time-reader){:target="_blank"}
