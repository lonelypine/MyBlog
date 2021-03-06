var crypto = require('crypto'),
    User = require('../models/user.js'),
    Post = require('../models/post.js');

var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  Post.getAll(null, function(err, posts) {
    if (err) {
      posts = [];
    }
    res.render('index', {
      title: '主页',
      user: req.session.user,
      posts: posts,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  });
});

router.get('/hello', function(req, res) {
  res.send('Hello world!');
});

// 当用户访问注册页面时,检查用户的状态是否满足于未登录状态
router.get('/reg', checkNotLogin);
router.get('/reg', function (req, res) {
  res.render('reg', {
    title: '注册账号',
    user: req.session.user,
    success: req.flash('success').toString(),
    error: req.flash('error').toString()
  });
});

// 当用户访问注册页面时,检查用户的状态是否满足于未登录状态
router.post('reg', checkNotLogin);
router.post('/reg', function (req, res) {
  var name = req.body.name,
      password = req.body.password,
      password_re = req.body['password_re'];
  //检验用户两次输入的密码是否一致
  if (password_re != password) {
    req.flash('error', '两次输入的密码不一致!');
    return res.redirect('/reg');    //返回注册页
  }
  //生成密码的 sha1 值
  var sha1 = crypto.createHash('sha1'),
      password = sha1.update(req.body.password).digest('hex');
  var newUser = new User({
    name: name,
    password: password,
    email: req.body.email
  });
  //检查用户名是否已经存在
  User.get(newUser.name, function (err, user) {
    if (err) {
      req.flash('error', err);
      return res.redirect('/');
    }
    if (user) {
      req.flash('error', '用户已存在!');
      return res.redirect('/reg');    //返回注册页
    }
    //如果不存在则新增用户
    newUser.save(function (err, user) {
      if (err) {
        req.flash('error', err);
        return res.redirect('/reg');    //注册失败返回注册页
      }
      req.session.user = newUser;  //用户信息存入 session
      req.flash('success', '注册成功!');
      res.redirect('/');  //注册成功后返回主页
    });
  });
});

// 当用户访问登录页面时,检查用户的状态是否满足于未登录状态
router.get('/login', checkNotLogin);
router.get('/login', function (req, res) {
  res.render('login', {
    title: '账号登录',
    user: req.session.user,
    success: req.flash('success').toString(),
    error: req.flash('error').toString()
  });
});

// 当用户访问登录页面时,检查用户的状态是否满足于未登录状态
router.post('/login', checkNotLogin);
router.post('/login', function (req, res) {
  // 生成密码的 sha1 值
  var sha1 = crypto.createHash('sha1'),
      password = sha1.update(req.body.password).digest('hex');
  User.get(req.body.name, function (err, user) {
    // 检查用户是否存在
    if (!user) {
      req.flash('error', '用户不存在');
      return res.redirect('/login');  // 如果用户不存在则跳转到登录页
    }
    // 检查密码是否正确
    if ( user.password != password) {
      req.flash('error', '密码错误!');
      return res.redirect('/login');  // 密码错误则自动跳转到登录页
    }
    // 用户和密码都匹配后, 将用户信息存入session
    req.session.user = user;
    req.flash('success', '登录成功!');
    res.redirect(('/'));  // 登录成功后跳转到主页
  })
});

// 当用户访问发送页面时,检查是否处于登录状态
router.get('/post', checkLogin);
router.get('/post', function (req, res) {
  res.render('post', {
    title: '发表',
    user: req.session.user,
    // 会返回 true 或 false 给 /post路径指向的post.ejs文件中的 <%= success %> 变量
    success: req.flash('success').toString(),
    // 会返回 true 或 false 给 /post路径指向的post.ejs文件中的 <%= error %> 变量
    error: req.flash('error').toString()
  });
});

// 当用户访问发送页面时,检查是否处于登录状态
router.post('/post', checkLogin);
router.post('/post', function (req, res) {
  var currentUser = req.session.user,
      post = new Post(currentUser.name, req.body.title, req.body.post);
      post.save(function (err) {
        if (err) {
          req.flash('error', err);
          return res.redirect('/');
        }
        req.flash('success', '发布成功!');
        res.redirect('/');  // 发表成功跳转到主页
      });
});

router.get('/logout', checkLogin);
router.get('/logout', function (req, res) {
  req.session.user = null;
  req.flash('success', '您已注销成功!');
  res.redirect('/');  // 注销成功后自动跳转到主页
});

router.get('/upload', checkLogin);
router.get('/upload', function (req, res) {
  res.render('upload', {
    title: '文件上传',
    user: req.session.user,
    success: req.flash('success').toString(),
    error: req.flash('error').toString()
  });
});

router.post('/upload', checkLogin);
router.post('/upload', function (req, res) {
  req.flash('success', '文件上传成功!');
  res.redirect('/upload');
});

router.get('/u/:name', function (req, res) {
  // 检查用户是否存在
  User.get(req.params.name, function (err, user) {
    if (!user) {
      req.flash('error', '用户不存在!');
      return res.redirect('/');   // 用户不存在则跳转到主页
    }
    // 查询并返回该用户的所有文章
    Post.getAll(user.name, function (err, posts) {
      if (err) {
        req.flash('error', err);
        return res.redirect('/');
      }
      res.render('user', {
        title: user.name,
        posts: posts,
        user: req.session.user,
        success: req.flash('success').toString(),
        error: req.flash('error').toString()
      });
    });
  });
});

router.get('/u/:name/:day/:title', function (req, res) {
  Post.getOne(req.params.name, req.params.day, req.params.title, function (err, post) {
    if (err) {
      console.log("显示文章页面失败");
      req.flash('error', err);
      return res.redirect('/');
    }
    console.log("显示文章页面成功");
    res.render('article', {
      title: req.params.title,
      post: post,
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  });
});

module.exports = router;

// 检查用户是否处于已登录状态了, 未登录则会报错, 并且跳转到登录界面
function checkLogin(req, res, next) {
  if (!req.session.user) {
    req.flash('error', '未登录');
    res.redirect('/login');
  }
  next();
}

// 检查用户是否处于未登录状态, 已登录则会报错, 并且返回到之前的页面
function checkNotLogin (req, res, next) {
  if (req.session.user) {
    req.flash('error', '由于您已登录, 请注销后再前往该页面');
    res.redirect('back');
  }
  next();
}















