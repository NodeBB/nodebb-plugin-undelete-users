'use strict';

const winston = require.main.require('winston');

const analytics = require.main.require('./src/analytics');
const db = require.main.require('./src/database');
const groups = require.main.require('./src/groups');
const meta = require.main.require('./src/meta');
const plugins = require.main.require('./src/plugins');
const slugify = require.main.require('./src/slugify');
const User = require.main.require('./src/user');

const user = { ...User };

user.create = async function (data) {
	data.username = data.username.trim();
	data.userslug = slugify(data.username);
	if (data.email !== undefined) {
		data.email = String(data.email).trim();
	}

	await User.isDataValid(data);

	await lock(data.username, '[[error:username-taken]]');
	if (data.email && data.email !== data.username) {
		await lock(data.email, '[[error:email-taken]]');
	}

	try {
		return await create(data);
	} finally {
		await db.deleteObjectFields('locks', [data.username, data.email]);
	}
};

async function lock(value, error) {
	const count = await db.incrObjectField('locks', value);
	if (count > 1) {
		throw new Error(error);
	}
}

async function create(data) {
	const extra_fields = ['postcount', 'reputation', 'topiccount'];
	const timestamp = data.timestamp || Date.now();

	let userData = {
		username: data.username,
		userslug: data.userslug,
		email: data.email || '',
		joindate: timestamp,
		lastonline: timestamp,
		status: 'offline', // don't make online
	};
	['picture', 'fullname', 'location', 'birthday'].concat(extra_fields).forEach((field) => {
		if (data[field]) {
			userData[field] = data[field];
		}
	});
	if (data.gdpr_consent === true) {
		userData.gdpr_consent = 1;
	}
	if (data.acceptTos === true) {
		userData.acceptTos = 1;
	}

	const renamedUsername = await User.uniqueUsername(userData);
	const userNameChanged = !!renamedUsername;
	if (userNameChanged) {
		userData.username = renamedUsername;
		userData.userslug = slugify(renamedUsername);
	}

	const results = await plugins.hooks.fire('filter:user.create', { user: userData, data: data });
	userData = results.user;

	let uid;
	if (parseInt(data.uid, 10)) {
		uid = parseInt(data.uid, 10);
	} else {
		uid = await db.incrObjectField('global', 'nextUid');
	}
	const isFirstUser = uid === 1;
	userData.uid = uid;

	if (isFirstUser) {
		userData['email:confirmed'] = 1;
	}
	await db.setObject(`user:${uid}`, userData);

	const bulkAdd = [
		['username:uid', userData.uid, userData.username],
		[`user:${userData.uid}:usernames`, timestamp, `${userData.username}:${timestamp}`],
		['username:sorted', 0, `${userData.username.toLowerCase()}:${userData.uid}`],
		['userslug:uid', userData.uid, userData.userslug],
		['users:joindate', timestamp, userData.uid],
		// not added to users:online
		['users:postcount', data.postCount || 0, userData.uid],
		['users:reputation', data.reputation || 0, userData.uid],
	];

	if (userData.fullname) {
		bulkAdd.push(['fullname:sorted', 0, `${userData.fullname.toLowerCase()}:${userData.uid}`]);
	}

	const groupsToJoin = ['registered-users'].concat(
		isFirstUser ? 'verified-users' : 'unverified-users'
	);

	await Promise.all([
		db.incrObjectField('global', 'userCount'),
		analytics.increment('registrations'),
		db.sortedSetAddBulk(bulkAdd),
		groups.join(groupsToJoin, userData.uid),
		User.notifications.sendWelcomeNotification(userData.uid),
		storePassword(userData.uid, data.password),
		User.updateDigestSetting(userData.uid, meta.config.dailyDigestFreq),
	]);

	if (userData.email && userData.uid > 1) {
		User.email.sendValidationEmail(userData.uid, {
			email: userData.email,
			template: 'welcome',
			subject: `[[email:welcome-to, ${meta.config.title || meta.config.browserTitle || 'NodeBB'}]]`,
		}).catch(err => winston.error(`[user.create] Validation email failed to send\n[emailer.send] ${err.stack}`));
	}
	if (userNameChanged) {
		await User.notifications.sendNameChangeNotification(userData.uid, userData.username);
	}
	plugins.hooks.fire('action:user.create', { user: userData, data: data });
	return userData.uid;
}

async function storePassword(uid, password) {
	if (!password) {
		return;
	}
	const hash = await User.hashPassword(password);
	await Promise.all([
		User.setUserFields(uid, {
			password: hash,
			'password:shaWrapped': 1,
		}),
		User.reset.updateExpiry(uid),
	]);
}

module.exports = user;
