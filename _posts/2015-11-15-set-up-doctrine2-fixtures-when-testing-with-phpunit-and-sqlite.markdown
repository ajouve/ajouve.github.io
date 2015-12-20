---
layout: post
title:  "Set up Doctrine2 fixtures when testing with PHPUnit and SQLite"
date:   2015-11-15 19:30:49 +0000
categories: Symfony2 PHPUnit Doctrine2

# Disqus
comments: true
---

## Requirements

### Composer

Composer is a dependency manager for PHP
We will install it globally for an easier usage

    curl -sS https://getcomposer.org/installer | php
    mv composer.phar /usr/local/bin/composer

now the `composer` command is available

### SQLite

We will execute the tests using a SQLite database to prevent dependencies management
Just install the PHP extension

    # Ubuntu
    sudo apt-get install php5-sqlite

    # Mac
    sudo port install php5-sqlite

### PHPUnit

First you will [PHPUnit](https://phpunit.de/){:target="_blank"} to run yours tests

Install PHPUnit via composer

    composer require --dev "phpunit/phpunit: 4.8.*"

The `--dev` option will add the `phpunit` to `require-dev` and not `require-dev`

### Doctrine Fixtures

Fixtures are used to load a controlled set of data into a database. This data can be used for testing or could be the initial data required for the application to run smoothly. Symfony has no built in way to manage fixtures but Doctrine2 has a library to help you write fixtures for the Doctrine `ORM` or `ODM`.

Install Doctrine Fixtures via composer

    composer require --dev doctrine/doctrine-fixtures-bundle

Then, update your `app/AppKernel.php` file to enable this bundle only for the `dev` and `test` environments:

{% highlight php %}
<?php
// app/AppKernel.php
// ...

class AppKernel extends Kernel
{
    public function registerBundles()
    {
        // ...
        if (in_array($this->getEnvironment(), array('dev', 'test'))) {
            $bundles[] = new Doctrine\Bundle\FixturesBundle\DoctrineFixturesBundle();
        }

        return $bundles
    }

    // ...
}
{% endhighlight %}

## Create our entity

{% highlight php %}
<?php

namespace AppBundle\Entity;

use Doctrine\ORM\Mapping as ORM;

/**
 * @ORM\Table(name="article")
 * @ORM\Entity
 */
class Article
{
    /**
     * @var integer
     *
     * @ORM\Column(name="id", type="integer")
     * @ORM\Id
     * @ORM\GeneratedValue(strategy="AUTO")
     */
    private $id;

    /**
     * @var string
     *
     * @ORM\Column(name="title", type="string", length=255)
     */
    private $title;

    /**
     * @var string
     *
     * @ORM\Column(name="content", type="text")
     */
    private $content;

    /**
     * @return int
     */
    public function getId()
    {
        return $this->id;
    }

    /**
     * @return string
     */
    public function getTitle()
    {
        return $this->title;
    }

    /**
     * @param string $title
     */
    public function setTitle($title)
    {
        $this->title = $title;
    }

    /**
     * @return string
     */
    public function getContent()
    {
        return $this->content;
    }

    /**
     * @param string $content
     */
    public function setContent($content)
    {
        $this->content = $content;
    }
}
{% endhighlight %}

## Create our fixture

{% highlight php %}
<?php

namespace AppBundle\DataFixtures\ORM;

use AppBundle\Entity\Article;
use Doctrine\Common\DataFixtures\FixtureInterface;
use Doctrine\Common\Persistence\ObjectManager;

class LoadArticleData implements FixtureInterface
{
    public function load(ObjectManager $manager)
    {
        $article = new Article();
        $article->setTitle('My first article');
        $article->setContent('This is my super article');

        $manager->persist($article);
        $manager->flush();
    }
}
{% endhighlight %}

You can learn more about Doctrine Fixtures on the [Symfony2 website](http://symfony.com/doc/current/bundles/DoctrineFixturesBundle/index.html){:target="_blank"}.

## Our first test

### Get the test class

I have a custom test class to load all the fixtures.
Add the package to composer

    composer require ajouve/doctrine-fixtures-test

The class is loading all your fixtures before each tests, have a look to the [repo](https://github.com/ajouve/doctrine-fixtures-test){:target="_blank"} for more informations.

### Write the test

Let's test the `findAll` method from the `repository`

{% highlight php %}
<?php

namespace AppBundle\Tests\Functional\Repository;

use Doctrine\ORM\EntityRepository;
use DoctrineFixturesTest\FixtureTestCase;

class ArticleRepositoryTest extends FixtureTestCase
{
    /** @var EntityRepository */
    private $articleRepository;

    public function setUp()
    {
        parent::setUp();

        $doctrine = $this->client->getContainer()->get('doctrine');

        $this->articleRepository = $doctrine->getRepository('AppBundle:Article');
    }

    public function testFindAll()
    {
        $articles = $this->articleRepository->findAll();

        $this->assertEquals('My first article', $articles[0]->getTitle());
    }
}
{% endhighlight %}

We will try to get all the articles and check id the first article title is the one defined in the fixture.

Before running the test we need to configure the configuration to specify the database we will use.
Update `app/config/config_test.yml`

    ...
    doctrine:
        dbal:
            driver:   pdo_sqlite
            host:     localhost
            port:     null
            dbname:   db_test
            user:     db_test
            password: db_pwd
            charset:  UTF8
            memory:   true

We will use a memory database with SQLite

Now we can finally run our test !

    bin/phpunit -c app

You should have something like

    PHPUnit 4.8.18 by Sebastian Bergmann and contributors.

    .

    Time: 1.33 seconds, Memory: 15.50Mb

    OK (1 test, 1 assertion)

I created a repo to sum up the tutorial [https://github.com/ajouve/doctrine-fixture-phpunit-example](https://github.com/ajouve/doctrine-fixture-phpunit-example){:target="_blank"}

I hope this tutorial will be useful for you, if you have any problem or remark you can contact me on twitter, just have a look to the footer for the details ;)
