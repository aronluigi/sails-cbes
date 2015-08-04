![image_squidhome@2x.png](http://i.imgur.com/RIvu9.png)

# Couchbase ElasticSearch sails js adaptor

Provides easy access to couchbase and elasticsearch from Sails.js & Waterline.

This module is a Waterline/Sails adapter. Its goal is to provide a set of declarative interfaces, conventions, and best-practices for integrating with all sorts of data sources. Not just databases-- external APIs, proprietary web services, or even hardware.

### Installation

To install this adapter, run:

```sh
$ npm install sails-cbes
```
### Before start keep in mind that
* Auto create Elasticsearch index
* ElasticSearch mapping is auto imported if it is defined in the model.
* To update Elasticsearch mapping you need to delete the index
* For each model a couchbase view will be created. The views are used for getting entire collection

Model with elastic search mapping example:
```javascript
module.exports = {
    identity: 'user',
    tableName: 'userTable',
    connection: 'semantic',

    attributes: {
        firstName: 'string',
        lastName: 'string',
        email: {
            type: 'string',
            defaultsTo: 'e@test.com'
        },
        avatar: 'binary',
        title: 'string',
        phone: 'string',
        type: 'string',
        favoriteFruit: {
            defaultsTo: 'blueberry',
            type: 'string'
        },
        age: 'integer', // integer field that's not auto-incrementable
        dob: 'datetime',
        status: {
            type: 'boolean',
            defaultsTo: false
        },
        percent: 'float',
        list: 'array',
        obj: 'json',
        fullName: function () {
            return this.firstName + ' ' + this.lastName;
        }
    },

    mapping: {
        "_all": {
            "enabled": false
        },
        firstName: {
            type: 'string',
            analyzer: 'whitespace',
            fields: {
                raw: {
                    type: 'string',
                    index: 'not_analyzed'
                }
            }
        },
        lastName: {
            type: 'string',
            analyzer: 'whitespace'
        },
        email: {
            type: 'string',
            analyzer: 'standard'
        },
        avatar: {
            type: 'binary'
        },
        title: {
            type: 'string',
            analyzer: 'whitespace',
        },
        phone: {
            type: 'string',
            analyzer: 'keyword'
        },
        type: {
            type: 'string',
            analyzer: 'keyword'
        },
        favoriteFruit: {
            type: 'string',
            analyzer: 'whitespace'
        },
        age: {
            type: 'integer',
            index: 'not_analyzed'
        },
        createdAt: {
            type: 'date',
            format: 'dateOptionalTime'
        },
        updatedAt: {
            type: 'date',
            format: 'dateOptionalTime'
        },
        status: {
            type: 'boolean'
        },
        percent: {
            type: 'float'
        },
        obj: {
            type: 'object'
        }
    }
};
```

### Configuration

```javascript
{
    //couchbase
    cb: {
        host: 'localhost',
        port: 8091,
        user: 'user',
        pass: 'password',
        operationTimeout: 60 * 1000, // 60s
    
        bucket: {
            name: 'bucket',
            pass: 'bucketPassword'
        }
    },
    
    //elasticsearch  
    es: {
        host: ['127.0.0.1:9200'],
        log: 'error',
        index: 'index',
        numberOfShards: 5,
        numberOfReplicas: 1
    }
},
```

### Usage

This adapter exposes the following methods:

###### `find()`

+ **Status**
  + Done
  
This method accepts Elastic Search [filtered query](http://www.elasticsearch.org/guide/en/elasticsearch/reference/current/query-dsl-filtered-query.html). Only send the filtered.filter part of the query!
```javascript
var elasticsearchFilterQuery = {
    bool: {
        must: [
            {
                term: {
                    type: 'createEach'
                }
            },
            {
                terms: {
                    firstName: ['createEach_1', 'createEach_2']
                }
            }
        ]
    }
};

Semantic.User.find()
    .where(elasticsearchFilterQuery)
    .skip(0)
    .limit(10)
    .sort({createdAt: 'desc'})
    .exec(function(err, res){
        // do something
    });
```
If you dont set no query to the find() method, find() will use couchbase view and return the entire collection.

This is the generated Elastic Search query for the above example:

```javascript
query: {
    filtered: {
        query: {
            bool: {
                must: [{
                    term: {
                        _type: {
                            value: modelType
                        }
                    }
                }]
            }
        },
        filter: {
            bool: {
                must: [
                    {
                        term: {
                            type: 'createEach'
                        }
                    },
                    {
                        terms: {
                            firstName: ['createEach_1', 'createEach_2']
                        }
                    }
                ]
            }
        }
    },
    size: 10,
    from: 0,
    sort: [
        {
            createdAt: {
                order: 'desc'
            }
        }
    ]
}

```

###### `findOne()`

+ **Status**
  + Done
  
This method accepts Elastic Search [filtered query](http://www.elasticsearch.org/guide/en/elasticsearch/reference/current/query-dsl-filtered-query.html). Only send the filtered.filter part of the query!

```javascript
var elasticsearchFilterQuery = {
    bool: {
        must: [
            {
                term: {
                    type: 'findOne'
                }
            }
        ]
    }
};

Semantic.User.findOne(elasticsearchFilterQuery).exec(function(err, res){
    // do something
});
```

###### `create()`

+ **Status**
  + Done
 
```javascript
Semantic.User.create({ firstName: 'createEach_1', type: 'createEach' }, function(err, res) {
    // do something
})
```

###### `createEach()`

+ **Status**
  + Done
 
```javascript
var usersArray = [
    { firstName: 'createEach_1', type: 'createEach' },
    { firstName: 'createEach_2', type: 'createEach' }
];
Semantic.User.createEach(usersArray, function(err, res) {
    // do something
})
```

###### `update()`

+ **Status**
  + Done

This method accepts Elastic Search [filtered query](http://www.elasticsearch.org/guide/en/elasticsearch/reference/current/query-dsl-filtered-query.html). Only send the filtered.filter part of the query!

Check find() method.
```javascript
var elasticsearchFilterQuery = {
    bool: {
        must: [
            {
                term: {
                    type: 'update'
                }
            },
            {
                term: {
                    firstName: 'update_1'
                }
            }
        ]
    }
};

Semantic.User.update(elasticsearchFilterQuery, {lastName: 'updated'}).exec(function(err, res){
    // do something
});
```

###### `destroy()`

+ **Status**
  + Done

This method accepts Elastic Search [filtered query](http://www.elasticsearch.org/guide/en/elasticsearch/reference/current/query-dsl-filtered-query.html). Only send the filtered.filter part of the query!

Check find() method.

```javascript
var elasticsearchFilterQuery = {
    bool: {
        must: [
            {
                term: {
                    type: 'getRawCollection'
                }
            }
        ]
    }
};

Semantic.User.destroy(elasticsearchFilterQuery).limit(999999).exec(function(err, res){
    // do something
});
```

###### `getRawCollection()`

+ **Status**
  + Done
 
This method returns raw data from Couchbase view.

``` javascript
Semantic.User.getRawCollection(function(err, res){
    // do something
});
```

###### `reindex()`

+ **Status**
  + Done
 
This method synchronizes couchbase and elasticsearch by dropping the mapping (along with the entries)
from elasticsearch and reimporting them from couchbase.

``` javascript
Semantic.User.reindex(function(err){
    // do something
});
```

###### `aggregate()`

+ **Status**
  + Done
 
This method returns the aggregation results according to the provided query (and aggregation specification). Read mode about
Elasticsearch aggregations [here](https://www.elastic.co/guide/en/elasticsearch/guide/current/aggregations.html). Unlike the 
Elasticsearch implementation, aggregations object should reside in the first layer within the query object (as opposed to side-by-side)
and only the "aggs" key is recognized ("aggregations" will not work). Note: the result is the unmodified JSON output of Elasticsearch  

Example usage:

``` javascript

var query = {
  "where" : {
    "and" : [
      {
        "or" : [
          {
            "term" : {
              "country" : "es"
            }
          },
          {
            "term" : {
              "country" : "pl"
            }
          }
        ]
      }
    ]
  }
}

var aggregations = {
  "account" : {
    "terms" : {
      "field" : "accountNumber"
    }
  },
  {
    "currency" : {
      "terms" : {
        "field" : "currency"
      }
    }
  }
}

query["aggs"] = aggregations;

Transaction.aggregate(query, function(err, res) {
  if (!err) ...
});
```

### Backup and Restore
 
###### `backup()`

+ **Status**
  + Done
 
This method create a full backup of the entire collection from couchbase.

``` javascript
var _options = {
    backupPath: 'backupPath'
};

Semantic.User.backup(options, function(err, stderror){
    // do something
});
```

For more information read the [cbbackup](http://docs.couchbase.com/admin/admin/Tasks/backup-cbbackup.html) documentation.

###### `restore()`

+ **Status**
  + Done
 
This method restore a full backup of the entire collection to couchbase and elasticsearch.

``` javascript
var _options = {
    backupPath: 'backupPath'
};

Semantic.User.restore(options, reindexDelay, function(err, stderror){
    // do something
});
```

The reindexDelay parameter is user to delay the reindex of every bucket on elasticsearch.

For more information read the [cbrestore](http://docs.couchbase.com/admin/admin/Tasks/restore-cbrestore.html) documentation.

### Document expiration (ttl)

In order to use the document expiration functionality, the model should contain an additional attribute, "_ttl", as in the following example:

``` javascript
module.exports = {
    connection: 'sailsCbes',
    attributes: {
        foo: {
            type: 'string',
            defaultsTo: 'bar'
        },
        _ttl: {
            type: 'int',
            defaultsTo: 1000 * 60 * 10 // 10 min
        }
    }
    mapping:{
        foo : {
            type : 'string',
            analyzer : 'standard',
            index : 'analyzed'
        }
    }
};
```

The default value for ttl must be specified like in the above example. A value of 0 means that by default the document does not expire.

Then the expiration timer can be specified for each document as follows:

``` javascript
var data = {
    foo  : 'newBar',
    _ttl : 1000 * 180
};
waterlineModel.create(data).exec(callback);
```


### Development

Check out **Connections** in the Sails docs, or see the `config/connections.js` file in a new Sails project for information on setting up adapters.

### Running the tests

In your adapter's directory, run:

```sh
$ npm test
```

### More Resources

- [Stackoverflow](http://stackoverflow.com/questions/tagged/sails.js)
- [#sailsjs on Freenode](http://webchat.freenode.net/) (IRC channel)
- [Twitter](https://twitter.com/sailsjs)
- [Professional/enterprise](https://github.com/balderdashy/sails-docs/blob/master/FAQ.md#are-there-professional-support-options)
- [Tutorials](https://github.com/balderdashy/sails-docs/blob/master/FAQ.md#where-do-i-get-help)
- <a href="http://sailsjs.org" target="_blank" title="Node.js framework for building realtime APIs."><img src="https://github-camo.global.ssl.fastly.net/9e49073459ed4e0e2687b80eaf515d87b0da4a6b/687474703a2f2f62616c64657264617368792e6769746875622e696f2f7361696c732f696d616765732f6c6f676f2e706e67" width=60 alt="Sails.js logo (small)"/></a>


### License

**[MIT](./LICENSE)**

<a href="https://www.kreditech.com/" target="_blank" title="Kreditech"><img src="https://www.kreditech.com/wp-content/themes/kreditech/img/logo.svg" width="340" height="50" alt="Kreditech"/></a>

&copy; 2015 [Kreditech](http://www.kreditech.com/) / [aronluigi](https://github.com/aronluigi) & [contributors] [Mohammad Bagheri](https://github.com/bagheri-m1986), [Robert Savu](https://github.com/r-savu), [Tiago Amorim](https://github.com/tiagoamorim85) & contributors


[Sails](http://sailsjs.org) is free and open-source under the [MIT License](http://sails.mit-license.org/)