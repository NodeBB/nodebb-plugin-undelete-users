<div class="row events undelete-users">
	<div class="col-lg-9">
		<div class="panel panel-default">
			<div class="panel-heading"><h3><i class="fa fa-user-cog"></i> Users to Undelete</h3></div>
			<div class="panel-body">
				{{{ if !visibleEventCount }}}
				<div class="alert alert-info">There are no users to restore with their contents.</div>
				{{{ end }}}
				<ul data-type="list" class="list-group">
					{{{ each events }}}
						<!-- IMPORT partials/item.tpl -->
					{{{ end }}}
					{{{ if pagination }}}
						<!-- IMPORT partials/paginator.tpl -->
					{{{ end }}}
				</ul>
				{{{ if loadMore }}}
				<button type="button" data-page="{loadPage}" class="btn btn-block btn-info load-more">Load more</button>
				{{{ end }}}
			</div>
		</div>
	</div>
	<div class="col-lg-3 acp-sidebar">
		<div class="panel panel-default">
			<div class="panel-heading">[[admin/advanced/events:filters]]</div>
			<div class="panel-body">
				<form role="form" id="filters">
					<div class="form-group">
						<label for="username">[[admin/manage/users:search.username]]</label>
						<input type="text" id="username" name="username" value="{query.username}" class="form-control" />
					</div>
					<div class="form-group">
						<label for="uid">[[admin/manage/users:search.uid]]</label>
						<input type="text" id="uid" name="uid" value="{query.uid}" class="form-control" />
					</div>
					<div class="form-group">
						<label for="email">[[admin/manage/users:search.email]]</label>
						<input type="text" id="email" name="email" value="{query.email}" class="form-control" />
					</div>
					<div class="form-group">
						<label for="start">[[admin/advanced/events:filter-start]]</label>
						<input type="date" id="start" name="start" value="{query.start}" class="form-control" />
					</div>
					<div class="form-group">
						<label for="end">[[admin/advanced/events:filter-end]]</label>
						<input type="date" id="end" name="end" value="{query.end}" class="form-control" />
					</div>
					<button type="submit" id="filter" class="btn btn-primary btn-block">[[admin/advanced/events:filters-apply]]</button>
				</form>
			</div>
		</div>
	</div>
</div>
