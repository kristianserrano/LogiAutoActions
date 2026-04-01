namespace Loupedeck.Test6Plugin
{
    using System;

    public class DynamicTreeProfileAction : PluginDynamicCommand
    {
        private Int32 _iteration = 0;

        public DynamicTreeProfileAction()
        {
            this.DisplayName = "DynamicTreeProfileAction";
            this.GroupName = "Profile Actions";

            this.MakeProfileAction("tree");
        }

        protected override void RunCommand(String actionParameter) => this.Plugin.OnPluginStatusChanged(PluginStatus.Warning, actionParameter, null, null);

        protected override PluginProfileActionData GetProfileActionData()
        {
            // create tree data

            var tree = new PluginProfileActionTree("Select item:");

            // describe levels

            tree.AddLevel("Level 1");
            tree.AddLevel("Level 2");

            // add data tree

            this._iteration++;

            for (var i = 0; i < 5; i++)
            {
                var node = tree.Root.AddNode($"({this._iteration}) Item {i}");

                for (var k = 0; k < 5; k++)
                {
                    var name = $"({this._iteration}) Item {i} SubItem {k}";
                    node.AddItem(name, name);
                }
            }

            // return tree data

            return tree;
        }
    }
}
