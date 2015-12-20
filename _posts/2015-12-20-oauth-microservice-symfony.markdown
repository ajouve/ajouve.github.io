---
layout: post
title:  "Create a microservice using Symfony and OAuth2"
date:   2015-12-19 19:30:49 +0000
categories: Symfony2 OAuth2 Microservice

# Disqus
comments: true
---

The goal of this tutorial is to create two Symfony2 application using an API secured by OAuth2 to communicate.
We will create an application to get the current date and an other one to display the time calling a micro service.

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

### Create our application

Let's create our API to access and edit our customers.

    $ symfony new customer_api 2.8
    $ cd date_api

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

    {"date":"2015-12-20","time":"12:43:34"}

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

    # app/config/services.yml
    services:
        command.oauth_create_client:
            class: AppBundle\Command\OAuthCreateClientCommand
            arguments:
                - @fos_oauth_server.client_manager.default
            tags:
                -  { name: console.command }

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

    {"date":"2015-12-20","time":"12:43:34"}
