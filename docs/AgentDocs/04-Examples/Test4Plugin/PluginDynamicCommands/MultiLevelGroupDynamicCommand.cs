namespace Loupedeck.Test4Plugin
{
    public class MultiLevelGroupDynamicCommand : PluginDynamicCommand
    {
        public MultiLevelGroupDynamicCommand()
            : base("Dynamic Test", "", "Group Level 1###Group Level 2")
        {
        }
    }
}
