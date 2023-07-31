'use strict';

const categories = require.main.require('./src/categories');
const db = require.main.require('./src/database');
const events = require.main.require('./src/events');
const utils = require.main.require('./src/utils');

const undelete = require('./undelete');

const {
	PLUGIN_EVENT_NAME,
	PLUGIN_ID,
} = require('../config');

const Controllers = module.exports;

Controllers.renderAdminPage = async function (req, res) {
	const data = await getEvents(req.query);
	res.render(`admin/plugins/${PLUGIN_ID}`, data);
};

async function getEvents(query) {
	const EVENT_TYPE = 'user-deleteAccount';

	// Trim and lowercase string filters
	query = Object.fromEntries(
		Object.entries(query).map(([key, val]) => [key, val.trim ? val.trim().toLowerCase() : val])
	);

	const page = parseInt(query.page, 10) || 1;
	const ITEMS_PER_PAGE = 30;
	const start = (page - 1) * ITEMS_PER_PAGE;
	const stop = start + ITEMS_PER_PAGE - 1;

	// Limit by date
	let from = query.start ? new Date(query.start) || undefined : undefined;
	let to = query.end ? new Date(query.end) || undefined : undefined;
	from = from && from.setHours(0, 0, 0, 0);	// setHours returns a unix timestamp (Number, not Date)
	to = to && to.setHours(23, 59, 59, 999);	// setHours returns a unix timestamp (Number, not Date)

	let eventData = [];
	let eventCount = 0;
	const seenUids = Object.create(null);

	if (hasSearchFilter(query)) {
		let pageStart = 0;
		let done = false;
		do {
			const pageStop = pageStart + 499;
			let pageEvents = await events.getEvents(EVENT_TYPE, pageStart, pageStop, from || '-inf', to);
			let filteredEvents = pageEvents.filter(e => !filterEvent(e, query));
			filteredEvents = hideDuplicateUids(filteredEvents, seenUids);
			filteredEvents = await hideExistingUids(filteredEvents);
			eventData.push(...filteredEvents);
			const eventsOnPage = eventData.slice(start, stop + 1);
			done = (eventsOnPage.length >= ITEMS_PER_PAGE || !pageEvents.length);
			pageStart += ITEMS_PER_PAGE;
		} while (!done);
		eventCount = eventData.length;
		eventData = eventData.slice(start, stop + 1);
	} else {
		eventData = await events.getEvents(EVENT_TYPE, start, stop, from || '-inf', to);
		eventCount = await db.sortedSetCount(`events:time:${EVENT_TYPE}`, from || '-inf', to || '+inf');
		eventData = hideDuplicateUids(eventData, seenUids);
		eventData = await hideExistingUids(eventData);
	}

	await addContentCounts(eventData);

	return {
		events: eventData,
		loadMore: eventCount > ITEMS_PER_PAGE * page,
		loadPage: page + 1,
		query,
	};
}

function hasSearchFilter(query) {
	return query && (query.username || query.email || query.uid);
}

function filterEvent(event, { username, uid, email }) {
	return (username && event.username && !event.username.toLowerCase().includes(username)) ||
		(uid && parseInt(event.targetUid, 10) !== parseInt(uid, 10)) ||
		(email && event.email && !event.email.toLowerCase().includes(email));
}

function hideDuplicateUids(events, seenUids) {
	return events.filter((e) => {
		if (e && e.targetUid && !seenUids[e.targetUid]) {
			seenUids[e.targetUid] = true;
			return true;
		}
		return false;
	});
}

async function hideExistingUids(events) {
	const targetUids = events.map(e => e.targetUid);
	const isMembers = await db.isSortedSetMembers('users:joindate', targetUids);
	return events.filter((e, idx) => !isMembers[idx]);
}

async function addContentCounts(events) {
	const cids = await categories.getAllCidsFromSet('categories:cid');

	await Promise.all(events.map(async (ev) => {
		const [postCount, reputation, topicCount] = await getContentCountsFromCids(cids, ev.targetUid);
		ev.postCount = postCount;
		ev.reputation = reputation;
		ev.topicCount = topicCount;
	}));
}

async function getContentCountsFromCids(cids, uid) {
	return Promise.all([
		db.sortedSetsCardSum(cids.map(c => `cid:${c}:uid:${uid}:pids`)),
		db.sortedSetsCardSum(cids.map(c => `cid:${c}:uid:${uid}:pids:votes`)),
		db.sortedSetsCardSum(cids.map(c => `cid:${c}:uid:${uid}:tids`)),
	]);
}

Controllers.undelete = async function (apiHelpers, req, res) {
	const { eid } = req.body;
	const event = await db.getObject(`event:${eid}`);

	if (!event) {
		return apiHelpers.formatApiResponse(400, res);
	}

	const cids = await categories.getAllCidsFromSet('categories:cid');
	const [postCount, reputation, topicCount] = await getContentCountsFromCids(cids, event.targetUid);

	const userData = {
		email: event.email,
		password: utils.generateUUID().slice(0, 8),
		postcount: postCount,
		reputation: reputation,
		topiccount: topicCount,
		uid: event.targetUid,
		username: event.username,
	};

	await undelete.create(userData);
	await events.log({
		email: userData.email,
		ip: req.ip,
		targetUid: userData.uid,
		type: PLUGIN_EVENT_NAME,
		uid: req.uid,
		username: userData.username,
	});

	return apiHelpers.formatApiResponse(200, res, { tmpPassword: userData.password });
};
