namespace Loupedeck.Test4Plugin
{
    using System;

    public class TreeProfileDynamicAction : PluginDynamicCommand
    {
        // https://www.thoughtco.com/most-common-us-surnames-1422656
        private readonly String[] _surnames = new[] { "Smith", "Johnson", "Williams", "Brown", "Jones" };

        // https://www.ssa.gov/oact/babynames/
        private readonly String[] _givenNames = new[] { "Liam", "Olivia", "Noah", "Emma", "Oliver", "Ava", "Elijah", "Charlotte", "William", "Sophia" };

        public TreeProfileDynamicAction()
        {
            this.DisplayName = "American Names";
            this.GroupName = "Test";

            this.MakeProfileAction("tree");
        }

        protected override void RunCommand(String actionParameter) => this.NativeApi.GetNativeMethods().SendString(actionParameter);

        protected override PluginProfileActionData GetProfileActionData()
        {
            // create tree data

            var tree = new PluginProfileActionTree("Select Name:");

            // describe levels

            tree.AddLevel("Surname");
            tree.AddLevel("Given Name");

            // add data tree

            foreach (var surname in this._surnames)
            {
                var node = tree.Root.AddNode(surname);

                foreach (var givenName in this._givenNames)
                {
                    node.AddItem($"{givenName} {surname}", givenName);
                }
            }

            // return tree data

            return tree;
        }
    }
}
